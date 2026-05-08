/**
 * PricingModal — Glass Edition
 * 4-step wizard · Auto geo-detection · WhatsApp + Dashboard
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, ChevronRight, ShoppingCart,
  ArrowRight, Star, Shield, Layers, Code, Camera,
  Megaphone, Settings2, TrendingUp, Lock, ArrowLeft,
  Receipt, Calculator, Package as PackageIcon, MessageSquare,
  User, Phone, Mail, FileText, Sparkles, Zap, Palette, RefreshCw, Save, AlertTriangle, Trash2, Copy, CheckCircle2
} from 'lucide-react';
import {
  PACKAGES, SERVICES, CATEGORIES,
  CATEGORY_LABELS, CATEGORY_LABELS_EN,
  getAllServices,
} from '@/data/pricing';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuthState } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { validateDiscountCode, DiscountCode } from '@/services/discountService';
import { submitContactForm } from '@/services/submissionService';
import { submitPricingRequest } from '@/services/pricingRequestService';
import {
  buildGuestTrackingUrl,
  checkGuestContactAvailability,
  GUEST_DUPLICATE_MESSAGE_AR,
  GUEST_DUPLICATE_MESSAGE_EN,
  type GuestTrackedRequest,
} from '@/services/guestTrackingService';
import { calculatePricing } from '@/lib/pricingEngine';
import { toast } from 'sonner';
import type { PricingRequest } from '@/types/dashboard';
import { useLanguage } from '@/context/LanguageContext';
import { AnimatedPrice, isValidPhoneNumber, slide } from '@/components/pricing/pricingHelpers';


// ── Types ──────────────────────────────────────────────────────────
interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRequest?: PricingRequest | null;
}

type Step = 'mode' | 'build' | 'details' | 'summary' | 'review' | 'success';
type Mode = 'packages' | 'custom' | null;

// ── Category Icons ─────────────────────────────────────────────────
const catIcons: Record<string, React.ReactNode> = {
  [CATEGORIES.WEB]: <Code className="w-3.5 h-3.5" />,
  [CATEGORIES.ECOM_BOOSTERS]: <ShoppingCart className="w-3.5 h-3.5" />,
  [CATEGORIES.BRAND_EXPERIENCE]: <Layers className="w-3.5 h-3.5" />,
  [CATEGORIES.BRAND_IDENTITY]: <Palette className="w-3.5 h-3.5" />,
  [CATEGORIES.GROWTH_ADS]: <TrendingUp className="w-3.5 h-3.5" />,
  [CATEGORIES.SECURITY]: <Lock className="w-3.5 h-3.5" />,
};

// ════════════════════════════════════════════════════════════════════
// LOCALSTORAGE HELPERS - Request Tracking (30-day expiry)
// ════════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'lumos_pending_request';
const LANGUAGE_STORAGE_KEY = 'lumos_app_language';
const EXPIRY_DAYS = 30;

interface StoredRequest {
  id?: string;
  invoiceNumber?: string | null;
  status: string;
  packageName: string;
  estimatedTotal: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  guestPhone?: string;
  guestName?: string;
  guestEmail?: string;
  lastCheckedAt?: string;
  selectedPkg?: string;
  selectedServices?: string[];
  mode?: 'packages' | 'custom';
  editCount?: number;
}

type ActiveRequestSnapshot = (PricingRequest | StoredRequest) & {
  admin_notes?: string | null;
};

const savePendingRequest = (request: {
  id?: string;
  invoiceNumber?: string | null;
  status: string;
  packageName: string;
  estimatedTotal: number;
  currency: string;
  guestPhone?: string;
  guestName?: string;
  guestEmail?: string;
  lastCheckedAt?: string;
  selectedPkg?: string;
  selectedServices?: string[];
  mode?: 'packages' | 'custom';
  editCount?: number;
}): void => {
  try {
    const now = new Date();
    const existing = loadPendingRequest();
    const isSameRequest = Boolean(
      (request.invoiceNumber && existing?.invoiceNumber === request.invoiceNumber)
      || (request.id && existing?.id === request.id),
    );
    const createdAt = isSameRequest ? existing!.createdAt : now.toISOString();
    const expiresAt = isSameRequest
      ? existing!.expiresAt
      : new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const stored: StoredRequest = {
      ...request,
      createdAt,
      expiresAt,
      lastCheckedAt: now.toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.error('Failed to save pending request:', e);
  }
};

const loadPendingRequest = (): StoredRequest | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const stored: StoredRequest = JSON.parse(data);
    const expiry = new Date(stored.expiresAt);
    if (isNaN(expiry.getTime()) || expiry < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch (e) {
    console.error('Failed to load pending request:', e);
    return null;
  }
};

const clearPendingRequest = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear pending request:', e);
  }
};

const shouldRefreshStatus = (stored: StoredRequest): boolean => {
  if (!stored.lastCheckedAt) return true;
  const lastChecked = new Date(stored.lastCheckedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 1;
};

const updateStoredRequestStatus = (id: string, status: string): void => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const stored: StoredRequest = JSON.parse(data);
    if (stored.id === id) {
      stored.status = status;
      stored.lastCheckedAt = new Date().toISOString();
      if (status === 'new' || status === 'reviewing') {
        stored.editCount = 0;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (e) {
    console.error('Failed to update stored request status:', e);
  }
};

const incrementLocalEditCount = (id: string): number => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    const stored: StoredRequest = JSON.parse(data);
    if (stored.id === id) {
      const newCount = (stored.editCount || 0) + 1;
      stored.editCount = newCount;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return newCount;
    }
    return 0;
  } catch (e) {
    console.error('Failed to increment edit count:', e);
    return 0;
  }
};

const getLocalEditCount = (id: string): number => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    const stored: StoredRequest = JSON.parse(data);
    if (stored.id === id) {
      return stored.editCount || 0;
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

const hasStoredLanguagePreference = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'ar' || stored === 'en';
  } catch {
    return false;
  }
};

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const PricingModal = ({ open, onOpenChange, initialRequest = null }: PricingModalProps) => {
  const { client, isAuthenticated, isAdmin } = useAuthState();
  const { language, setLanguage, isArabic: globalArabic } = useLanguage();

  /* ── Geo-detection ── */
  const {
    convertPrice, currency, currencySymbol,
    isEgypt, language: geoLang, loading: geoLoading,
  } = useCurrency();

  /* ── State ── */
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>(null);
  const [lang, setLang] = useState<'ar' | 'en'>(language);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [latestClientRequest, setLatestClientRequest] = useState<PricingRequest | null>(null);
  const [latestRequestLoading, setLatestRequestLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES.WEB);
  const [contact, setContact] = useState({ name: '', phone: '', email: '', notes: '' });
  const [submittedRequest, setSubmittedRequest] = useState<PricingRequest | null>(null);
  const [savedPendingRequest, setSavedPendingRequest] = useState<StoredRequest | null>(null);
  const [isTrackingView, setIsTrackingView] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [requestEditCount, setRequestEditCount] = useState<Record<string, number>>({});

  /* ── Validation States ── */
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }>({});

  /* ── Duplicate Check State ── */
  const [duplicateCheck, setDuplicateCheck] = useState<{
    isLoading: boolean;
    found: boolean;
    error?: string | null;
  }>({ isLoading: false, found: false, error: null });

  const [guestTrackingResult, setGuestTrackingResult] = useState<{
    request: GuestTrackedRequest;
    trackingKey: string;
    trackingUrl: string;
  } | null>(null);

  /* ── isAr Helper ── */
  const isAr = lang === 'ar';

  /* ── Validation Helpers ── */
  const validateName = (name: string, isArVal: boolean): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) return isArVal ? 'الاسم مطلوب' : 'Name is required';
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) return isArVal ? 'الاسم يجب أن يكون مكون من كلمتين (اسم وكنية)' : 'Name must have at least 2 words';
    return undefined;
  };

  const validatePhone = (phone: string, isArVal: boolean): string | undefined => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return isArVal ? 'رقم الهاتف مطلوب' : 'Phone is required';
    if (digits.length !== 11) return isArVal ? 'رقم الهاتف يجب أن يكون 11 رقم' : 'Phone must be 11 digits';
    if (!digits.startsWith('01')) return isArVal ? 'رقم الهاتف يجب أن يبدأ بـ 01' : 'Phone must start with 01';
    const prefix = digits.substring(0, 3);
    if (!['010', '011', '012', '015'].includes(prefix)) {
      return isArVal ? 'بادئة غير صحيحة، استخدم: 010 أو 011 أو 012 أو 015' : 'Invalid prefix, use: 010, 011, 012, or 015';
    }
    return undefined;
  };

  const validateEmail = (email: string, isArVal: boolean): string | undefined => {
    if (!email) return undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return isArVal ? 'بريد إلكتروني غير صحيح' : 'Invalid email address';
    }
    return undefined;
  };

  const validateNotes = (notes: string, isArVal: boolean): string | undefined => {
    if (!notes.trim()) return undefined;
    const words = notes.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 5) {
      return isArVal ? 'الوصف يجب أن يكون 5 كلمات على الأقل' : 'Notes must be at least 5 words';
    }
    return undefined;
  };

  const isNameValid = contact.name ? !validateName(contact.name, isAr) : undefined;
  const isPhoneValid = contact.phone ? !validatePhone(contact.phone, isAr) : undefined;
  const isEmailValid = contact.email ? !validateEmail(contact.email, isAr) : undefined;
  const isNotesValid = contact.notes ? !validateNotes(contact.notes, isAr) : undefined;

  /* ── Check Duplicate Contact via safe RPC ── */
  const checkDuplicateContact = useCallback(async (phone: string, email: string, name: string) => {
    void name;
    // Reset if no data to check
    if (!phone && !email) {
      setDuplicateCheck({ isLoading: false, found: false, error: null });
      return;
    }

    setDuplicateCheck(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await checkGuestContactAvailability({ phone, email });
      setDuplicateCheck({
        isLoading: false,
        found: !result.available,
        error: result.error || null,
      });
    } catch (error) {
      console.error('Error checking duplicate:', error);
      setDuplicateCheck({ isLoading: false, found: false, error: null });
    }
  }, []);

  /* ── Promo Code States ── */
  const [promoCode, setPromoCode] = useState('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<DiscountCode | null>(null);

  /* ── Launch Deal & Easter Egg States ── */
  const [is3MonthCommitment, setIs3MonthCommitment] = useState(false);
  const [easterEggStage1Unlocked, setEasterEggStage1Unlocked] = useState(false);
  const [easterEggStage2Unlocked, setEasterEggStage2Unlocked] = useState(false);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);
  const [hasSeenEasterEggModal, setHasSeenEasterEggModal] = useState(false);

  const [sending, setSending] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isKnownClient = isAuthenticated && !isAdmin && !!client?.id;

/* ── Sync geo language (only when no stored preference exists) ── */
  useEffect(() => {
    if (!geoLoading && geoLang && !open && !hasStoredLanguagePreference()) {
      setLang(geoLang as 'ar' | 'en');
    }
  }, [geoLoading, geoLang, open]);

  /* ── Sync local lang state from global language on modal open ── */
  useEffect(() => {
    if (!open) return;
    setLang(language);
  }, [language, open]);

  /* ── Load saved pending request on modal open ── */
  useEffect(() => {
    if (!open) return;
    const saved = loadPendingRequest();
    if (!saved) return;
    const updated = { ...saved, lastCheckedAt: new Date().toISOString() };
    setSavedPendingRequest(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setStep('success');
    setIsTrackingView(true);
    setIsEditingMode(false);
    setContact({
      name: saved.guestName || '',
      phone: saved.guestPhone || '',
      email: saved.guestEmail || '',
      notes: '',
    });
    if (saved.mode === 'packages') {
      setMode('packages');
      setSelectedPkg(saved.selectedPkg || null);
    } else if (saved.mode === 'custom' && saved.selectedServices) {
      setMode('custom');
      setSelectedServices(new Set(saved.selectedServices));
    }
  }, [open]);

  /* ── 40-Second Easter Egg Trigger ── */
  useEffect(() => {
    if (open && !hasSeenEasterEggModal && step === 'build') {
      const timer = setTimeout(() => {
        if (!showEasterEggModal && !easterEggStage2Unlocked) {
          setShowEasterEggModal(true);
          setHasSeenEasterEggModal(true);
        }
      }, 40000);
      return () => clearTimeout(timer);
    }
  }, [open, hasSeenEasterEggModal, step, showEasterEggModal, easterEggStage2Unlocked]);

  const hydrateRequest = useCallback((request: PricingRequest) => {
    setEditingRequestId(request.id);
    setStep('build');
    setMode(request.request_type === 'package' ? 'packages' : 'custom');
    setSelectedPkg(request.package_id || null);
    setSelectedServices(new Set((request.selected_services || []).map((item) => item.id)));
    setActiveCategory(request.selected_services?.[0]?.category || CATEGORIES.WEB);
    setContact({
      name: request.guest_name || '',
      phone: request.guest_phone || '',
      email: request.guest_email || '',
      notes: request.request_notes || '',
    });
  }, []);

  /* ── Reset on open ── */
  useEffect(() => {
    if (open) {
      if (initialRequest) {
        hydrateRequest(initialRequest);
      } else {
        // If there's a saved pending request, the tracking effect handles the UI —
        // don't reset or it will wipe step='success' set by that effect.
        if (loadPendingRequest()) return;
        setEditingRequestId(null);
        setStep('mode');
        setMode(null);
        setSelectedPkg(null);
        setSelectedServices(new Set());
        setActiveCategory(CATEGORIES.WEB);
        setContact({ name: '', phone: '', email: '', notes: '' });
        setPromoCode('');
        setAppliedPromo(null);
        setPromoError('');
        setDuplicateCheck({ isLoading: false, found: false, error: null });
        setGuestTrackingResult(null);
      }
    }
  }, [hydrateRequest, initialRequest, open]);

  useEffect(() => {
    if (!open || !isKnownClient || !client?.id) {
      setLatestClientRequest(null);
      return;
    }

    let cancelled = false;

    const loadLatestClientRequest = async () => {
      setLatestRequestLoading(true);
      const { data, error } = await supabase
        .from('pricing_requests')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          setLatestClientRequest(null);
        } else {
          setLatestClientRequest((data as PricingRequest | null) || null);
        }
        setLatestRequestLoading(false);
      }
    };

    void loadLatestClientRequest();

    return () => {
      cancelled = true;
    };
  }, [client?.id, isKnownClient, open]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const scrollTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* ── Toggle service ── */
  const toggleService = useCallback((id: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ── Totals (Powered by PricingEngine) ── */
  const engineContext = useMemo(() => calculatePricing({
    mode,
    selectedPkg,
    selectedServices,
    appliedPromo,
    is3MonthCommitment,
    easterEggStage1Unlocked,
    easterEggStage2Unlocked
  }), [mode, selectedPkg, selectedServices, appliedPromo, is3MonthCommitment, easterEggStage1Unlocked, easterEggStage2Unlocked]);

  // Map engine outputs to existing component fields for backwards compatibility
  const totals = useMemo(() => ({
    subtotal: engineContext.subtotal,
    total: engineContext.finalTotal,
    discount: engineContext.totalCashDiscountValue,
    promoDiscountValue: engineContext.promoDiscountValue,
    items: engineContext.items,
    count: engineContext.itemCount,
    // Expose new fields for the configurator UI
    unlockedRewards: engineContext.unlockedRewards,
    bonusPerks: engineContext.bonusPerks,
    eligibleServiceCount: engineContext.eligibleServiceCount,
    totalDiscountPercentage: engineContext.totalDiscountPercentage
  }), [engineContext]);

  // Resolve the localized name of the selected package up-front so that
  // buildPricingPayload (declared just below) can reference it without
  // hitting a temporal dead zone.
  const selectedPackageName = useMemo(() => {
    if (!selectedPkg) return null;
    const pkg = Object.values(PACKAGES).find(p => p.id === selectedPkg);
    if (!pkg) return null;
    return isAr ? pkg.nameAr : pkg.name;
  }, [isAr, selectedPkg]);

  /**
   * Build the payload sent to `submitPricingRequest`. This is the single source of
   * truth for what gets persisted on a pricing_requests row, regardless of which
   * submission button the user pressed (WhatsApp, Save to dashboard, Confirm).
   *
   * For logged-in clients we always populate the contact snapshot (guest_name etc.)
   * from the client profile. The DB columns named `guest_*` actually hold any
   * contact snapshot — without them the admin dashboard falls back to "Unnamed".
   * The active `client_id` is what distinguishes a real client from a true guest.
   *
   * Discount fields (`appliedPromoCode`, `discountBreakdown`) are always included
   * when a code is active, so they show up in the admin even if the user never
   * opened the discount input again before submitting.
   */
  const buildPricingPayload = useCallback((opts?: { withLocationUrl?: boolean }) => {
    const isPackages = mode === 'packages';
    const baseDiscount = Math.max(0, (totals.discount || 0) - (totals.promoDiscountValue || 0));
    const hasDiscount = !!appliedPromo || baseDiscount > 0;

    const snapshotName = isKnownClient && client
      ? (client.full_contact_name || client.display_name || client.username || contact.name || '').trim()
      : contact.name.trim();
    const snapshotPhone = isKnownClient && client
      ? (client.phone || client.phone_number || contact.phone || '').trim()
      : contact.phone.trim();
    const snapshotEmail = isKnownClient && client
      ? (client.email || contact.email || '').trim()
      : contact.email.trim();
    const snapshotCompany = isKnownClient && client
      ? (client.company_name || '').trim()
      : '';

    const guestContact = (snapshotName || snapshotPhone || snapshotEmail)
      ? { name: snapshotName, phone: snapshotPhone, email: snapshotEmail || undefined }
      : undefined;

    return {
      requestId: editingRequestId,
      clientId: isKnownClient && client?.id ? client.id : undefined,
      requestType: (isPackages ? 'package' : 'custom') as 'package' | 'custom',
      packageId: isPackages ? selectedPkg : null,
      packageName: isPackages ? selectedPackageName : 'Custom Plan',
      selectedServices: totals.items,
      estimatedSubtotal: totals.subtotal,
      estimatedTotal: totals.total,
      priceCurrency: currency || 'EGP',
      requestNotes: contact.notes || undefined,
      guestContact,
      companyName: snapshotCompany || undefined,
      appliedPromoCode: appliedPromo?.code,
      discountBreakdown: hasDiscount
        ? {
            base_discount: Number.isFinite(baseDiscount) ? baseDiscount : 0,
            promo_discount: Number.isFinite(totals.promoDiscountValue) ? totals.promoDiscountValue : 0,
            reward_discount: 0,
            total_discount_percent: totals.totalDiscountPercentage || 0,
          }
        : undefined,
      locationUrl: opts?.withLocationUrl ? window.location.href : undefined,
    };
  }, [isKnownClient, client, contact, mode, selectedPkg, selectedPackageName, totals, currency, editingRequestId, appliedPromo]);

  /* ── Validate Promo Code ── */
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsCheckingPromo(true);
    setPromoError('');

    const res = await validateDiscountCode(promoCode);
    setIsCheckingPromo(false);

    if (res.success && res.data) {
      setAppliedPromo(res.data);
      setPromoError('');
    } else {
      setAppliedPromo(null);
      setPromoError(res.error || (isAr ? 'كود الخصم غير صحيح' : 'Invalid promo code'));
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  /* ── Price display ── */
  const showPrice = useCallback((egp: number) => {
    if (isEgypt || currency === 'EGP') return `${egp.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`;
    return `$${convertPrice(egp).toLocaleString()}`;
  }, [isEgypt, currency, isAr, convertPrice]);

  /* ── Group items by category ── */
  const groupedItems = useMemo(() => {
    return totals.items.reduce<Record<string, InvoiceItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [totals.items]);

  /* ── Navigation ── */
  const selectMode = useCallback((m: Mode) => { setMode(m); setStep('build'); scrollTop(); }, [scrollTop]);

  const accountDisplayName = client?.company_name || client?.display_name || client?.username || (isAr ? 'عميل مسجل' : 'Logged-in client');
  const isEditing = !!editingRequestId;
  const selectedCustomItems = useMemo(() => totals.items, [totals.items]);
  const activeRequestContext = initialRequest || latestClientRequest;
  const selectionPreviewItems = useMemo(() => totals.items.slice(0, 8), [totals.items]);
  const hiddenSelectionCount = Math.max(totals.items.length - selectionPreviewItems.length, 0);

  const requestStatusMeta = useMemo(() => {
    if (!activeRequestContext) return null;

    switch (activeRequestContext.status) {
      case 'reviewing':
        return {
          label: isAr ? 'قيد المراجعة' : 'Under Review',
          pill: 'bg-amber-50 text-amber-700 border-amber-200',
          note: isAr ? 'الفريق يراجع الآن التفاصيل والتسعير قبل الاعتماد.' : 'The team is reviewing the scope and pricing before approval.',
          nextStep: isAr ? 'انتظر قرار المراجعة أو عدل الطلب إذا طُلب منك ذلك.' : 'Wait for review feedback or update the request if asked.',
          progress: 50,
        };
      case 'approved':
        return {
          label: isAr ? 'تمت الموافقة' : 'Approved',
          pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          note: isAr ? 'تمت الموافقة على الطلب وأصبح جاهزاً للخطوة التجارية التالية.' : 'Your request is approved and ready for the next commercial step.',
          nextStep: isAr ? 'يمكن لفريقنا تحويله إلى أوردر أو متابعة التنفيذ التجاري.' : 'Our team can convert it into an order or continue the commercial process.',
          progress: 75,
        };
      case 'converted':
        return {
          label: isAr ? 'تم تحويله لأوردر' : 'Converted To Order',
          pill: 'bg-violet-50 text-violet-700 border-violet-200',
          note: isAr ? 'طلبك أصبح أوردر نشط ويتم متابعته داخل الحساب ولوحة الأدمن.' : 'Your request has been converted into a live order and is now tracked across your account and admin dashboard.',
          nextStep: isAr ? 'تابع التنفيذ من داخل البروفايل أو تواصل مع الفريق لأي توسعة جديدة.' : 'Track delivery from your profile or contact the team for any new scope.',
          progress: 100,
        };
      case 'rejected':
        return {
          label: isAr ? 'بحاجة لتعديل' : 'Needs Revision',
          pill: 'bg-rose-50 text-rose-700 border-rose-200',
          note: isAr ? 'الطلب يحتاج تعديل في النطاق أو التفاصيل قبل اعتماده.' : 'The request needs a scope or detail revision before it can be approved.',
          nextStep: isAr ? 'افتح نفس الطلب وعدّل الخدمات أو الملاحظات ثم أعد الإرسال.' : 'Reopen the same request, adjust the scope or notes, then resubmit it.',
          progress: 60,
        };
      case 'cancelled':
        return {
          label: isAr ? 'تم الإلغاء' : 'Cancelled',
          pill: 'bg-slate-100 text-slate-700 border-slate-200',
          note: isAr ? 'تم إلغاء الطلب، ولن يتم تعديله من هنا.' : 'This request was cancelled and cannot be edited here.',
          nextStep: isAr ? 'تواصل مع الفريق لو احتجت إعادة فتح أو طلب جديد.' : 'Contact the team if you need to reopen or start a new request.',
          progress: 25,
        };
      default:
        return {
          label: isAr ? 'تم الاستلام' : 'Received',
          pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          note: isAr ? 'وصل طلبك إلى الفريق وينتظر بدء المراجعة.' : 'Your request has reached the team and is waiting for review.',
          nextStep: isAr ? 'سيبدأ الفريق المراجعة ثم تظهر الحالة التالية هنا.' : 'The team will start the review and the next status will appear here.',
          progress: 25,
        };
    }
  }, [activeRequestContext, isAr]);

  const requestFlowSteps = useMemo(() => {
    if (!activeRequestContext) return [] as Array<{ key: string; label: string; state: 'done' | 'current' | 'pending' }>;

    const currentIndex = activeRequestContext.status === 'new'
      ? 0
      : activeRequestContext.status === 'reviewing'
        ? 1
        : activeRequestContext.status === 'approved'
          ? 2
          : activeRequestContext.status === 'converted'
            ? 3
            : 2;

    const labels = activeRequestContext.status === 'rejected'
      ? [
        isAr ? 'استلام الطلب' : 'Received',
        isAr ? 'مراجعة' : 'Review',
        isAr ? 'مطلوب تعديل' : 'Revision',
        isAr ? 'إعادة الإرسال' : 'Resubmit',
      ]
      : [
        isAr ? 'استلام الطلب' : 'Received',
        isAr ? 'قيد المراجعة' : 'Review',
        isAr ? 'اعتماد' : 'Approval',
        isAr ? 'أوردر' : 'Order',
      ];

    return labels.map((label, index) => ({
      key: `${label}-${index}`,
      label,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
    }));
  }, [activeRequestContext, isAr]);

  const goNext = useCallback(async () => {
    if (step === 'build') {
      if ((mode === 'packages' && !selectedPkg) || (mode === 'custom' && selectedServices.size === 0)) {
        toast.error(isAr ? 'اختر باقة أو خدمة واحدة على الأقل للمتابعة.' : 'Please select a package or at least one service to continue.');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      if (!isKnownClient) {
        const nameError = validateName(contact.name, isAr);
        const phoneError = validatePhone(contact.phone, isAr);
        const emailError = contact.email ? validateEmail(contact.email, isAr) : undefined;
        
        if (nameError || phoneError || emailError) {
          setValidationErrors({
            name: nameError,
            phone: phoneError,
            email: emailError,
          });
          toast.error(isAr ? 'أكمل بيانات التواصل بشكل صحيح قبل المتابعة.' : 'Please complete valid contact details before continuing.');
          return;
        }

        const availability = await checkGuestContactAvailability({
          phone: contact.phone,
          email: contact.email,
        });

        if (!availability.available) {
          setDuplicateCheck({ isLoading: false, found: true, error: availability.error || 'duplicate_contact' });
          toast.error(isAr ? GUEST_DUPLICATE_MESSAGE_AR : GUEST_DUPLICATE_MESSAGE_EN);
          return;
        }

        // Block if duplicate contact found by the latest safe precheck.
        if (duplicateCheck.found) {
          toast.error(isAr ? GUEST_DUPLICATE_MESSAGE_AR : GUEST_DUPLICATE_MESSAGE_EN);
          return;
        }
      }
      setValidationErrors({});
      setStep('summary');
    } else if (step === 'summary') {
      setStep('review');
    }
    scrollTop();
  }, [step, mode, selectedPkg, selectedServices, contact, scrollTop, isKnownClient, isAr, duplicateCheck]);

  const goBack = useCallback(() => {
    if (step === 'review') setStep('summary');
    else if (step === 'summary') setStep('details');
    else if (step === 'details') setStep('build');
    else if (step === 'build') { setStep('mode'); setMode(null); }
    scrollTop();
  }, [step, scrollTop]);

  /* ── WhatsApp message ── */
  const buildMessage = useCallback(() => {
    const cur = isEgypt ? (isAr ? 'ج.م' : 'EGP') : 'USD';
    const totalVal = isEgypt ? totals.total.toLocaleString() : convertPrice(totals.total).toLocaleString();
    const line = '━━━━━━━━━━━━━━━━━━';
    const t = isAr;
    let m = `📋 *${t ? 'طلب جديد — LUMOS' : 'New Order — LUMOS'}*\n${line}\n`;

    if (mode === 'packages') {
      const pkg = Object.values(PACKAGES).find(p => p.id === selectedPkg);
      m += `📌 ${t ? 'النوع: باقة جاهزة' : 'Type: Ready Package'}\n`;
      m += `📦 ${t ? 'الباقة' : 'Package'}: ${t ? pkg?.nameAr : pkg?.name}\n\n`;
      m += `🔧 *${t ? 'المشمول' : 'Included'}:*\n`;
      pkg?.features.forEach(f => { m += `  • ${t ? f.textAr : f.text}\n`; });
    } else {
      m += `📌 ${t ? 'النوع: خطة مخصصة' : 'Type: Custom Plan'}\n\n🔧 *${t ? 'الخدمات' : 'Services'}:*\n`;
      Object.entries(groupedItems).forEach(([cat, items]) => {
        const catLabel = t ? CATEGORY_LABELS[cat] : CATEGORY_LABELS_EN[cat];
        m += `\n┃ ${catLabel}\n`;
        items.forEach(item => {
          m += `┃  • ${t ? item.nameAr : item.name} — ${showPrice(item.price)}\n`;
        });
      });
    }

    m += `\n💰 *${t ? 'الملخص' : 'Summary'}:*\n`;
    m += `  ${t ? 'المجموع' : 'Subtotal'}: ${showPrice(totals.subtotal)}\n`;

    if (totals.discount && totals.discount > 0) {
      // Show effective specific discounts if applicable
      const baseDiscount = totals.discount - totals.promoDiscountValue;
      if (baseDiscount > 0) {
        if (mode === 'custom' && totals.totalDiscountPercentage > 0) {
          m += `  ${t ? 'خصم مجمع' : 'Bundle Discount'} (${totals.totalDiscountPercentage}%): -${showPrice(baseDiscount)}\n`;
        } else if (mode === 'packages') {
          m += `  ${t ? 'عرض الـ 3 شهور (-10%)' : '3-Months Offer (-10%)'}: -${showPrice(baseDiscount)}\n`;
        }
      }
      if (appliedPromo) {
        m += `  ${t ? 'كود خصم' : 'Promo Code'} (${appliedPromo.code}): -${showPrice(totals.promoDiscountValue)}\n`;
      }
    }

    if (totals.unlockedRewards && totals.unlockedRewards.length > 0) {
      m += `\n🎁 *${t ? 'المكافآت المكتسبة' : 'Unlocked Rewards'}:*\n`;
      totals.unlockedRewards.forEach(r => {
        m += `  🎉 ${t ? r.titleAr : r.title}\n`;
      });
    }

    if (totals.bonusPerks && totals.bonusPerks.length > 0) {
      m += `\n✨ *${t ? 'المزايا الإضافية' : 'Bonus Perks'}:*\n`;
      totals.bonusPerks.forEach(p => {
        m += `  ⭐ ${t ? p.titleAr : p.title}\n`;
      });
    }

    m += `  ${t ? 'الضريبة' : 'Tax'}: ✅ ${t ? 'مجاناً' : 'FREE'}\n`;
    m += `  ${line}\n`;
    m += `  ${t ? 'الإجمالي' : 'Total'}: *${totalVal} ${cur}*\n\n`;
    m += `👤 *${t ? 'بيانات التواصل' : 'Contact'}:*\n`;
    m += `  ${t ? 'الاسم' : 'Name'}: ${contact.name}\n`;
    m += `  ${t ? 'الهاتف' : 'Phone'}: ${contact.phone}\n`;
    if (contact.email) m += `  ${t ? 'الإيميل' : 'Email'}: ${contact.email}\n`;
    if (contact.notes) m += `  ${t ? 'ملاحظات' : 'Notes'}: ${contact.notes}\n`;
    m += `\n🕐 ${new Date().toLocaleDateString(t ? 'ar-EG' : 'en-US')}`;

    return m;
  }, [isAr, isEgypt, mode, selectedPkg, totals, groupedItems, contact, showPrice, convertPrice, appliedPromo]);

  /* ── Send: Supabase + WhatsApp ── */
  const handleSend = useCallback(async () => {
    setSending(true);
    const msg = buildMessage();

    if (isKnownClient && client?.id) {
      const result = await submitPricingRequest(buildPricingPayload());

      setSending(false);

      if (!result.success) {
        toast.error(result.error || (isAr ? 'فشل إرسال طلب التسعير' : 'Failed to submit pricing request'));
        return;
      }

      toast.success(isEditing
        ? (isAr ? 'تم تحديث طلب التسعير وإرساله من جديد للمراجعة.' : 'Pricing request updated and resubmitted for review.')
        : (isAr ? 'تم حفظ طلب التسعير في حسابك وإرساله للأدمن للمراجعة.' : 'Pricing request saved to your account and sent to admin for review.'));
      onOpenChange(false);
      return;
    }

    // 1. Save to admin dashboard
    try {
      await submitPricingRequest(buildPricingPayload({ withLocationUrl: true }));

      await submitContactForm(
        {
          name: contact.name,
          phone: contact.phone,
          message: msg,
          serviceNeeded: mode === 'packages' ? `Package: ${selectedPkg}` : 'Custom Plan',
        },
        null,
        'Pricing Order'
      );
    } catch (e) {
      console.error('Order save failed:', e);
    }

    // 2. Open WhatsApp
    window.open(`https://wa.me/201277636616?text=${encodeURIComponent(msg)}`, '_blank');
    setSending(false);
  }, [buildMessage, buildPricingPayload, client?.id, contact, isAr, isEditing, isKnownClient, mode, onOpenChange, selectedPkg]);

  /* ── Save to Dashboard Only (without WhatsApp) ── */
  const handleSaveToDashboard = useCallback(async () => {
    setSending(true);
    
    if (isKnownClient && client?.id) {
      const result = await submitPricingRequest(buildPricingPayload());

      setSending(false);

      if (!result.success) {
        toast.error(result.error || (isAr ? 'فشل حفظ الطلب' : 'Failed to save request'));
        return;
      }

      toast.success(isEditing
        ? (isAr ? 'تم تحديث الطلب بنجاح' : 'Request updated successfully')
        : (isAr ? 'تم حفظ الطلب بنجاح' : 'Request saved successfully'));
      onOpenChange(false);
      return;
    }

    // Guest: Save to dashboard only
    try {
      await submitPricingRequest(buildPricingPayload({ withLocationUrl: true }));

      await submitContactForm(
        {
          name: contact.name,
          phone: contact.phone,
          message: buildMessage(),
          serviceNeeded: mode === 'packages' ? `Package: ${selectedPkg}` : 'Custom Plan',
        },
        null,
        'Pricing Order'
      );
      
      toast.success(isAr ? 'تم حفظ الطلب بنجاح' : 'Request saved successfully');
      onOpenChange(false);
    } catch (e) {
      console.error('Order save failed:', e);
      toast.error(isAr ? 'فشل حفظ الطلب' : 'Failed to save request');
    }
    
    setSending(false);
  }, [buildMessage, buildPricingPayload, client?.id, contact, isAr, isEditing, isKnownClient, mode, onOpenChange, selectedPkg]);

  /* ── Confirm: Save to Database and Show Success ── */
  const handleConfirm = useCallback(async () => {
    setSending(true);
    
    try {
      // 1. Save pricing request (single source of truth — buildPricingPayload picks
      //    up the auth client snapshot for logged-in users automatically).
      const result = await submitPricingRequest(
        buildPricingPayload({ withLocationUrl: !isKnownClient }),
      );

      if (!result.success) {
        toast.error(result.error === 'duplicate_contact'
          ? (isAr ? GUEST_DUPLICATE_MESSAGE_AR : GUEST_DUPLICATE_MESSAGE_EN)
          : result.error || (isAr ? 'فشل حفظ الطلب' : 'Failed to save request'));
        setSending(false);
        return;
      }

      // 2. Save contact form
      await submitContactForm(
        {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          message: buildMessage(),
          serviceNeeded: mode === 'packages' ? `Package: ${selectedPkg}` : 'Custom Plan',
        },
        null,
        'Pricing Order'
      );

      // 3. For guests: keep only the safe RPC response and a convenience cache.
      if (!isKnownClient && result.guestRequest && result.trackingKey) {
          const trackingUrl = buildGuestTrackingUrl(result.guestRequest.invoice_number, result.trackingKey);
          setGuestTrackingResult({
            request: result.guestRequest,
            trackingKey: result.trackingKey,
            trackingUrl,
          });
          savePendingRequest({
            invoiceNumber: result.guestRequest.invoice_number,
            status: result.guestRequest.status || 'new',
            packageName: result.guestRequest.package_name || selectedPackageName || 'Custom Plan',
            estimatedTotal: result.guestRequest.estimated_total || totals.total,
            currency: result.guestRequest.price_currency || currency || 'EGP',
            guestPhone: contact.phone,
            guestName: contact.name,
            guestEmail: contact.email,
            selectedPkg: mode === 'packages' ? selectedPkg : undefined,
            selectedServices: mode === 'custom' ? Array.from(selectedServices) : undefined,
            mode: mode,
            editCount: 0,
          });
      } else if (isKnownClient && client?.id && result.id) {
        // For logged-in clients, fetch the newly created request
        const { data: newRequest } = await supabase
          .from('pricing_requests')
          .select('*')
          .eq('id', result.id)
          .single();
        
        if (newRequest) {
          setSubmittedRequest(newRequest as PricingRequest);
          setRequestEditCount(prev => ({ ...prev, [newRequest.id]: 0 }));
        }
      }

      // 4. Show success message
      toast.success(isEditing
        ? (isAr ? 'تم تحديث طلبك بنجاح' : 'Your request has been updated successfully')
        : (isAr ? 'تم إرسال طلبك بنجاح' : 'Your request has been submitted successfully'));

      // 5. Move to success step
      setStep('success');
      
    } catch (e) {
      console.error('Confirm failed:', e);
      toast.error(isAr ? 'فشل حفظ الطلب' : 'Failed to save request');
    }
    
    setSending(false);
  }, [isKnownClient, client?.id, mode, selectedPkg, selectedServices, selectedPackageName, totals, currency, contact, isAr, isEditing, buildMessage, buildPricingPayload]);

  /* ── Edit Request (from success screen) ── */
  const handleEditRequest = useCallback(async () => {
    if (guestTrackingResult) {
      window.location.href = guestTrackingResult.trackingUrl;
      return;
    }

    const activeReq = submittedRequest || latestClientRequest;
    const isTrackingMode = savedPendingRequest && !submittedRequest && !latestClientRequest;

    if (isTrackingMode) {
      const invoice = savedPendingRequest?.invoiceNumber || '';
      window.location.href = invoice
        ? buildGuestTrackingUrl(invoice)
        : '/track-request';
      return;
    }

    const currentRequest = (isTrackingMode ? savedPendingRequest : activeReq) as ActiveRequestSnapshot | null;
    const currentStatus = currentRequest?.status || 'new';
    const currentEditCount = isTrackingMode 
      ? (savedPendingRequest?.editCount || 0) 
      : (requestEditCount[currentRequest?.id] || 0);
    
    if (currentEditCount >= 3) {
      toast.error(isAr ? 'لقد استخدمت جميع محاولات التعديل (3)' : 'You have used all edit attempts (3)');
      return;
    }
    
    if (currentStatus !== 'new' && currentStatus !== 'reviewing') {
      toast.error(isAr ? 'لا يمكن تعديل الطلب في هذه المرحلة' : 'Cannot edit request at this stage');
      return;
    }
    
    if (submittedRequest) {
      hydrateRequest(submittedRequest);
      setStep('build');
    } else if (latestClientRequest) {
      hydrateRequest(latestClientRequest);
      setStep('build');
    }
    
    const newCount = currentEditCount + 1;
    if (currentRequest?.id) {
      setRequestEditCount(prev => ({ ...prev, [currentRequest.id]: newCount }));
      await supabase
        .from('pricing_requests')
        .update({ edit_count: newCount })
        .eq('id', currentRequest.id);
    }
  }, [guestTrackingResult, submittedRequest, latestClientRequest, savedPendingRequest, hydrateRequest, requestEditCount, isAr]);

  /* ── Cancel Request ── */
  const handleCancelRequest = useCallback(async () => {
    if (!submittedRequest && !latestClientRequest) return;
    
    const requestToCancel = submittedRequest || latestClientRequest;
    if (!requestToCancel?.id) return;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('pricing_requests')
      .update({
        status: 'cancelled',
        status_history: [
          ...(requestToCancel.status_history || []),
          { status: 'cancelled', changed_at: now, changed_by: client?.id || null, note: 'Client cancelled request' },
        ],
        updated_at: now,
      })
      .eq('id', requestToCancel.id);

    if (error) {
      toast.error(isAr ? 'فشل إلغاء الطلب' : 'Failed to cancel request');
      return;
    }

    setSubmittedRequest(prev => prev ? { ...prev, status: 'cancelled' } : null);
    
    toast.success(isAr ? 'تم إلغاء الطلب بنجاح' : 'Request cancelled successfully');
  }, [submittedRequest, latestClientRequest, client?.id, isAr]);

  /* ── Step config ── */
  const stepsList: { key: Step; en: string; ar: string }[] = useMemo(() => [
    { key: 'mode', en: 'Mode', ar: 'البداية' },
    { key: 'build', en: 'Service', ar: 'الخدمة' },
    { key: 'details', en: isKnownClient ? 'Notes' : 'Contact', ar: isKnownClient ? 'ملاحظات' : 'بياناتك' },
    { key: 'summary', en: 'Receipt', ar: 'الفاتورة' },
    { key: 'review', en: 'Confirm', ar: 'تأكيد' },
    { key: 'success', en: 'Done', ar: 'تم' },
  ], [isKnownClient]);

  const currentIdx = stepsList.findIndex(s => s.key === step);

  const canProceed = step === 'build'
    ? (mode === 'packages' ? !!selectedPkg : selectedServices.size > 0)
    : step === 'details'
      ? (isKnownClient ? true : !!(contact.name.trim() && isPhoneValid && isEmailValid))
      : true;

  const nextButtonTitle = !canProceed && step === 'details'
    ? (!contact.name.trim() ? (isAr ? 'الاسم مطلوب' : 'Name is required')
      : !isPhoneValid ? (isAr ? 'رقم الهاتف غير صحيح' : 'Invalid phone number')
        : !isEmailValid ? (isAr ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address')
          : '')
    : '';

  // ════════════════════════════════════════════════════════════════
  // RENDER — Portal to document.body to escape all stacking contexts
  // ════════════════════════════════════════════════════════════════
  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center p-0 sm:p-4"
          style={{ zIndex: 999999 }}
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-[rgba(22,34,29,0.42)] backdrop-blur-sm" />

          {/* ── Modal Panel — Immersive Glass ── */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-5xl bg-[linear-gradient(180deg,#fffef8_0%,#f7fbf6_100%)] sm:rounded-[2rem] border border-[rgba(17,94,69,0.14)] shadow-[0_32px_80px_rgba(18,38,29,0.18)] overflow-hidden flex flex-col"
          >
            {/* Subtle ambient glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
              <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-300/25 blur-[100px] rounded-full" />
              <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-amber-300/20 blur-[100px] rounded-full" />
            </div>

            {/* ════ HEADER ════ */}
            <header className="relative z-10 shrink-0 px-6 py-4 border-b border-[rgba(17,94,69,0.10)] bg-[linear-gradient(180deg,rgba(255,253,247,0.96)_0%,rgba(245,250,246,0.96)_100%)] backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      {isAr ? 'الأسعار' : 'Pricing'}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] text-emerald-700 font-bold tracking-widest uppercase">
                        {isAr ? 'بدون ضريبة' : 'TAX FREE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!geoLoading && (
                    <div className="px-2.5 py-1 rounded-full bg-white border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                        {currency}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
  const next = lang === 'ar' ? 'en' : 'ar';
  setLang(next);
  setLanguage(next);
}}
                    className="w-10 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all font-black"
                    title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
                  >
                    {isAr ? 'EN' : 'AR'}
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>



              {/* Step Progress bar */}
              {step !== 'mode' && (
                <div className="relative h-1.5 w-full bg-[rgba(17,94,69,0.08)] rounded-full overflow-hidden mt-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx + 1) / stepsList.length) * 100}%` }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400"
                  />
                </div>
              )}
            </header>

            {/* ════ CONTENT ════ */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto scrollbar-none"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {isKnownClient && activeRequestContext && requestStatusMeta && (
                <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)] px-6 py-4">
                  <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${requestStatusMeta.pill}`}>
                            {requestStatusMeta.label}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {activeRequestContext.request_type === 'package' ? (isAr ? 'باقة جاهزة' : 'Ready Package') : (isAr ? 'خطة مخصصة' : 'Custom Plan')}
                          </span>
                          {isEditing && (
                            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700">
                              {isAr ? 'أنت تعدل نفس الطلب' : 'Editing Existing Request'}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-base font-black text-slate-900">
                          {activeRequestContext.package_name || (activeRequestContext.request_type === 'custom' ? (isAr ? 'خطة مخصصة' : 'Custom Plan') : (isAr ? 'باقة جاهزة' : 'Ready Package'))}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{requestStatusMeta.note}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">{requestStatusMeta.nextStep}</p>

                        {activeRequestContext.selected_services.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-[rgba(17,94,69,0.10)] bg-[rgba(16,185,129,0.04)] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                {isAr ? 'الخدمات التي اخترتها' : 'Selected Services'}
                              </p>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {activeRequestContext.selected_services.length} {isAr ? 'خدمة' : 'items'}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {activeRequestContext.selected_services.map((service) => (
                                <span
                                  key={`${activeRequestContext.id}-${service.id}`}
                                  className="rounded-full border border-[rgba(17,94,69,0.14)] bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm"
                                >
                                  {isAr ? service.nameAr : service.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid min-w-[240px] grid-cols-2 gap-3 lg:max-w-[300px]">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? 'القيمة' : 'Value'}</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{activeRequestContext.estimated_total.toLocaleString()} {activeRequestContext.price_currency}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? 'آخر تحديث' : 'Updated'}</p>
                          <p className="mt-2 text-sm font-bold text-slate-900">{new Date(activeRequestContext.updated_at || activeRequestContext.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{isAr ? 'تقدم الطلب الحالي' : 'Current request progress'}</span>
                        <span>{requestStatusMeta.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${requestStatusMeta.progress}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {requestFlowSteps.map((flowStep) => (
                        <div key={flowStep.key} className={`rounded-2xl border px-3 py-3 text-center ${flowStep.state === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : flowStep.state === 'current' ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                          <div className="text-[10px] font-black uppercase tracking-widest">{flowStep.label}</div>
                        </div>
                      ))}
                    </div>

                    {!initialRequest && latestClientRequest && latestClientRequest.status !== 'converted' && !isEditing && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => hydrateRequest(latestClientRequest)}
                          className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-200"
                        >
                          {isAr ? 'كمّل على نفس الطلب' : 'Continue This Request'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRequestId(null);
                            setStep('mode');
                            setMode(null);
                            setSelectedPkg(null);
                            setSelectedServices(new Set());
                            setActiveCategory(CATEGORIES.WEB);
                            setContact({ name: '', phone: '', email: '', notes: '' });
                          }}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-emerald-200 hover:text-emerald-700"
                        >
                          {isAr ? 'ابدأ طلب جديد' : 'Start Fresh'}
                        </button>
                      </div>
                    )}

                    {latestRequestLoading && !latestClientRequest && (
                      <p className="mt-4 text-xs text-slate-400">{isAr ? 'جارٍ تحميل آخر حالة للطلب...' : 'Loading latest request status...'}</p>
                    )}
                  </div>
                </div>
              )}

              {mode && totals.count > 0 && (
                <div className="border-b border-[rgba(17,94,69,0.08)] bg-[linear-gradient(180deg,rgba(255,251,242,0.88)_0%,rgba(255,255,255,0.94)_100%)] px-6 py-4">
                  <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-[rgba(217,119,6,0.14)] bg-white/95 p-4 shadow-[0_10px_28px_rgba(146,64,14,0.08)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                            {isAr ? 'اختياراتك الحالية' : 'Current Selection'}
                          </span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            {totals.count} {isAr ? 'عنصر' : 'items'}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-black text-slate-900">
                          {mode === 'packages'
                            ? `${isAr ? 'الباقة المختارة' : 'Selected Package'}: ${selectedPackageName || (isAr ? 'باقة جاهزة' : 'Ready Package')}`
                            : (isAr ? 'الخدمات التي اخترتها ظاهرة هنا أثناء التعديل والمراجعة.' : 'Your selected services stay visible here while you build and review.')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectionPreviewItems.map((item) => (
                            <span key={item.id} className="rounded-full border border-[rgba(17,94,69,0.14)] bg-[rgba(16,185,129,0.08)] px-3 py-1 text-xs font-semibold text-emerald-700">
                              {isAr ? item.nameAr : item.name}
                            </span>
                          ))}
                          {hiddenSelectionCount > 0 && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                              +{hiddenSelectionCount} {isAr ? 'أخرى' : 'more'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:max-w-[260px]">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? 'الإجمالي' : 'Total'}</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{showPrice(totals.total)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? 'النوع' : 'Mode'}</p>
                          <p className="mt-2 text-sm font-bold text-slate-900">{mode === 'packages' ? (isAr ? 'باقة' : 'Package') : (isAr ? 'مخصص' : 'Custom')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">

                {/* ──────── STEP 1: MODE CHOICE ──────── */}
                {step === 'mode' && (
                  <motion.div key="mode" {...slide} className="p-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                      <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tight"
                      >
                        {isAr ? 'اختر مسارك' : 'Pick Your Path'}
                      </motion.h1>
                      <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto font-semibold">
                        {isAr ? 'حلول ذكية وجاهزة أو بناء مفصل' : 'Smart solutions or a fully custom build'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ready Packages Card — The "Safe" choice */}
                      <button
                        onClick={() => selectMode('packages')}
                        className="group relative h-52 sm:h-60 rounded-[1.75rem] overflow-hidden border-2 border-[rgba(17,94,69,0.10)] bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:border-emerald-400 hover:shadow-[0_12px_40px_rgba(16,185,129,0.14)] transition-all duration-400 text-left shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                      >
                        <div className="absolute top-5 right-5 z-20">
                          <div className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black tracking-widest uppercase border border-emerald-200">
                            {isAr ? 'بدون ضريبة' : 'TAX FREE'}
                          </div>
                        </div>
                        <div className="absolute inset-0 p-7 flex flex-col justify-between z-10">
                          <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                            <PackageIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5 group-hover:text-emerald-700 transition-colors">
                              {isAr ? 'باقات جاهزة' : 'Ready Packages'}
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed font-medium">
                              {isAr ? 'انطلاق سريع بخصم الوكالة المعتمد' : 'Instant takeoff with agency rates'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                            {isAr ? 'استكشف الباقات' : 'Explore Packages'} <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </button>

                      {/* Custom Build Card */}
                      <button
                        onClick={() => selectMode('custom')}
                        className="group relative h-52 sm:h-60 rounded-[1.75rem] overflow-hidden border-2 border-[rgba(217,119,6,0.10)] bg-gradient-to-br from-amber-50 via-white to-orange-50 hover:border-amber-400 hover:shadow-[0_12px_40px_rgba(245,158,11,0.14)] transition-all duration-400 text-left shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                      >
                        <div className="absolute top-5 right-5 z-20">
                          <div className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black tracking-widest uppercase border border-amber-200">
                            {isAr ? 'مرونة عالية' : 'FLEXIBLE'}
                          </div>
                        </div>
                        <div className="absolute inset-0 p-7 flex flex-col justify-between z-10">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                            <Calculator className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5 group-hover:text-amber-700 transition-colors">
                              {isAr ? 'بناء مخصص' : 'Custom Builder'}
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed font-medium">
                              {isAr ? 'تحكم كامل في ميزانيتك وخدماتك' : 'Total control over your services'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold">
                            {isAr ? 'ابدأ البناء' : 'Begin Building'} <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ──────── STEP 2: CONFIGURE ──────── */}
                {step === 'build' && (
                  <motion.div key="build" {...slide} className="p-6 sm:p-10">
                    {mode === 'packages' ? (
                      /* ═══ PACKAGES VIEW ═══ */
                      <div className="max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {Object.values(PACKAGES).map(pkg => {
                            const isSel = selectedPkg === pkg.id;
                            const isPop = pkg.id === 'lumos_presence';
                            return (
                              <div
                                key={pkg.id}
                                onClick={() => setSelectedPkg(pkg.id)}
                                className={`relative group rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 ${isSel
                                  ? 'border-emerald-500 bg-emerald-50 shadow-[0_8px_40px_rgba(16,185,129,0.18)]'
                                  : 'border-[rgba(17,94,69,0.10)] bg-white/95 hover:border-emerald-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
                                  }`}
                              >
                                {isPop && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-[10px] font-black tracking-widest text-white shadow-md z-20">
                                    RECOMMENDED
                                  </div>
                                )}

                                <div className="p-7">
                                  <div className="flex justify-between items-start mb-5">
                                    <div>
                                      <h3 className="text-2xl font-black text-slate-900 mb-1">
                                        {isAr ? pkg.nameAr : pkg.name}
                                      </h3>
                                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        {isAr ? 'بدون ضريبة' : 'TAX FREE'}
                                      </span>
                                    </div>
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${isSel ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                                      }`}>
                                      {isSel ? <Check className="w-5 h-5" /> : <PackageIcon className="w-5 h-5" />}
                                    </div>
                                  </div>

                                  <div className="mb-7">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                                        {isEgypt ? pkg.price.toLocaleString() : convertPrice(pkg.price).toLocaleString()}
                                      </span>
                                      <span className="text-slate-400 text-sm font-bold">{currencySymbol}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      <span className="text-xs text-slate-400 line-through tabular-nums decoration-slate-300">
                                        {isEgypt ? pkg.originalPrice.toLocaleString() : convertPrice(pkg.originalPrice).toLocaleString()}
                                      </span>
                                      <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 uppercase tracking-widest leading-none flex items-center h-5">
                                        {isAr ? 'وفر' : 'Save'} {isEgypt ? pkg.savings.toLocaleString() : convertPrice(pkg.savings).toLocaleString()}
                                      </span>
                                      <span className="text-[9px] text-indigo-600 font-black px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 uppercase tracking-widest flex items-center gap-1 h-5 shadow-sm">
                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                        {isAr ? 'عرض 3 شهور (-10%)' : '3-Months Offer (-10%)'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    {pkg.features.map((f, i) => (
                                      <div key={i} className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSel ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                          }`}>
                                          <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs sm:text-sm text-slate-500 font-medium">
                                          {isAr ? f.textAr : f.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className={`px-7 py-4 border-t rounded-b-[1.5rem] text-center font-black text-[10px] tracking-widest uppercase transition-all ${isSel ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-slate-300 border-slate-100 group-hover:text-slate-500'
                                  }`}>
                                  {isSel ? (isAr ? 'تم الاختيار ✓' : 'SELECTED ✓') : (isAr ? 'اختر هذه الباقة' : 'SELECT PACKAGE')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* ═══ CUSTOM BUILDER ═══ */
                      <div className="max-w-6xl mx-auto">
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar scroll-smooth">
                          {Object.entries(SERVICES).map(([catId, items]) => {
                            const isActive = activeCategory === catId;
                            const isBrandId = catId === CATEGORIES.BRAND_IDENTITY;
                            const count = items.filter(i => selectedServices.has(i.id)).length;
                            return (
                              <button
                                key={catId}
                                onClick={() => setActiveCategory(catId)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-all shrink-0 border ${isActive
                                  ? isBrandId
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-[0_4px_14px_rgba(99,102,241,0.30)]'
                                    : 'bg-amber-500 text-white border-amber-500 shadow-[0_4px_14px_rgba(245,158,11,0.30)]'
                                  : isBrandId
                                    ? 'bg-indigo-50/50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                              >
                                {catIcons[catId]}
                                <span>{isAr ? CATEGORY_LABELS[catId] : CATEGORY_LABELS_EN[catId]}</span>
                                {count > 0 && (
                                  <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive
                                    ? (isBrandId ? 'bg-white text-indigo-700' : 'bg-white text-amber-700')
                                    : (isBrandId ? 'bg-indigo-200 text-indigo-800' : 'bg-amber-500 text-white')
                                    }`}>
                                    {count}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* ── Unlock Your Launch Deal Configurator ── */}
                        <div className="mb-8 p-6 sm:p-8 rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(to_right,rgba(236,253,245,0.8),rgba(255,255,255,0.9))] shadow-[0_8px_30px_rgba(16,185,129,0.06)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-20 group-hover:bg-emerald-500/20 transition-colors duration-700" />
                          <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                              <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
                                  <Sparkles className="w-5 h-5 text-emerald-500" />
                                  {isAr ? 'افتح عروض انطلاقتك' : 'Unlock Your Launch Deal'}
                                </h3>
                                <p className="text-sm font-medium text-slate-500">
                                  {isAr ? 'اختر خدماتك واكتسب مكافآت حصرية كلما بنيت باقتك.' : 'Select services and unlock exclusive rewards as you build your package.'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                  {totals.eligibleServiceCount} {isAr ? 'مختارة' : 'Selected'}
                                </span>
                              </div>
                            </div>

                            {/* Progress Visual */}
                            <div className="relative h-2.5 w-full bg-emerald-100/50 rounded-full overflow-hidden mb-6">
                              <motion.div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (totals.eligibleServiceCount / 4) * 100)}%` }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                              />
                            </div>

                            {/* Reward Milestones */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              {[
                                { req: 2, label: isAr ? 'SSL مجاني' : 'Free SSL ✨', isUnlocked: totals.eligibleServiceCount >= 2 },
                                { req: 3, label: isAr ? 'إعداد بيكسل' : 'Free Pixel ✨', isUnlocked: totals.eligibleServiceCount >= 3 },
                                { req: 4, label: isAr ? 'خصم 10%' : '10% Cash Off', isUnlocked: totals.eligibleServiceCount >= 4 && totals.eligibleServiceCount < (SERVICES[CATEGORIES.BRAND_IDENTITY]?.length || 8) },
                                { isBundle: true, req: SERVICES[CATEGORIES.BRAND_IDENTITY]?.length || 8, label: isAr ? 'باقة 15%' : 'Full Bundle 15%', isUnlocked: totals.totalDiscountPercentage >= 15 }
                              ].map((tier, idx) => (
                                <div
                                  key={idx}
                                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 ${tier.isUnlocked ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm scale-[1.02]' : 'bg-white/50 text-slate-400 border-slate-200'}`}
                                >
                                  <span className="text-[13px] font-black text-center">{tier.label}</span>
                                  <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${tier.isUnlocked ? 'text-emerald-500' : 'text-slate-300'}`}>
                                    {tier.isUnlocked ? (isAr ? 'مكتسب ✓' : 'UNLOCKED ✓') : (isAr ? (tier.isBundle ? 'اختيار الهوية الكاملة' : `${tier.req} خدمات`) : (tier.isBundle ? 'Full Brand Scope' : `${tier.req} Services`))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          {/* Services Feed */}
                          <div className="lg:col-span-8">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col gap-6"
                              >
                                {activeCategory === CATEGORIES.BRAND_IDENTITY && (
                                  <div className="relative p-6 sm:p-8 rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-[0_12px_40px_rgba(99,102,241,0.30)] group">
                                    <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                      <Palette className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                      <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] font-black tracking-widest uppercase mb-3 text-indigo-100">
                                          <Sparkles className="w-3.5 h-3.5" /> {isAr ? 'عرض خاص' : 'SPECIAL OFFER'}
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-black mb-1">{isAr ? 'هوية بصرية كاملة' : 'Full Brand Identity'}</h3>
                                        <p className="text-indigo-200 text-sm">{isAr ? 'احصل على جميع خدمات الهوية من الألف إلى الياء بخصم 20%' : 'Get all brand identity services from A to Z with a 20% discount'}</p>
                                      </div>
                                      <div className="shrink-0 flex flex-col items-start md:items-end">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-4xl font-black tracking-tight tabular-nums">
                                            {isEgypt ? (8880).toLocaleString() : convertPrice(8880).toLocaleString()}
                                          </span>
                                          <span className="text-indigo-300 font-bold">{currencySymbol}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-indigo-200">
                                          <span className="text-sm line-through tabular-nums">{isEgypt ? (11100).toLocaleString() : convertPrice(11100).toLocaleString()}</span>
                                          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">{isAr ? 'وفر 2,220' : 'Save 2,220'}</span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const itemIds = SERVICES[CATEGORIES.BRAND_IDENTITY].map((s: { id: string }) => s.id);
                                            const allSelected = itemIds.every((id: string) => selectedServices.has(id));
                                            setSelectedServices((prev: Set<string>) => {
                                              const next = new Set(prev);
                                              if (allSelected) {
                                                itemIds.forEach((id: string) => next.delete(id));
                                              } else {
                                                itemIds.forEach((id: string) => next.add(id));
                                              }
                                              return next;
                                            });
                                          }}
                                          className="mt-4 w-full bg-white text-indigo-600 hover:bg-indigo-50 transition-colors font-black text-[11px] tracking-widest uppercase py-3 px-6 rounded-full flex items-center justify-center shadow-lg"
                                        >
                                          {SERVICES[CATEGORIES.BRAND_IDENTITY].every((s: { id: string }) => selectedServices.has(s.id))
                                            ? (isAr ? 'إلغاء تحديد الكل' : 'DESELECT ALL')
                                            : (isAr ? 'اختيار الكل (8 خدمات)' : 'SELECT ALL (8 ITEMS)')}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {(SERVICES[activeCategory] || []).map(svc => {
                                    const on = selectedServices.has(svc.id);
                                    return (
                                      <button
                                        key={svc.id}
                                        onClick={() => toggleService(svc.id)}
                                        className={`group text-start p-5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${on
                                          ? 'border-amber-400 bg-amber-50 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
                                          : 'border-slate-200 bg-white/95 hover:border-amber-300 hover:shadow-sm'
                                          }`}
                                      >
                                        <div className="flex justify-between items-start mb-3">
                                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${on ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 text-transparent'
                                            }`}>
                                            <Check className="w-3.5 h-3.5" />
                                          </div>
                                          <span className={`text-sm font-black tabular-nums ${on ? 'text-amber-700' : 'text-slate-500'}`}>
                                            {showPrice(svc.price)}
                                          </span>
                                        </div>

                                        <div>
                                          <h4 className={`text-sm font-bold mb-1 transition-colors ${on ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {isAr ? svc.nameAr : svc.name}
                                          </h4>
                                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                            {svc.description}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </AnimatePresence>

                            {/* ── 3-Month Commitment Toggle ── */}
                            <div className="mt-6 p-5 rounded-[1.25rem] border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-4 group hover:border-emerald-200 bg-white"
                              onClick={() => setIs3MonthCommitment(!is3MonthCommitment)}>
                              <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${is3MonthCommitment ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className={`text-sm font-bold mb-0.5 transition-colors ${is3MonthCommitment ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {isAr ? 'الالتزام بـ 3 أشهر' : '3-Month Commitment Strategy'}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    {isAr ? 'احصل على خصم إضافي 10% عند اعتماد خطة طويلة المدى.' : 'Unlock an extra 10% discount when committing for a quarter.'}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${is3MonthCommitment ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  +10% {isAr ? 'خصم' : 'OFF'}
                                </span>
                              </div>
                            </div>

                            {/* ── (Easter Egg moved to Time-triggered Modal) ── */}

                          </div>

                          {/* ── High-Tech Invoice (Desktop) ── */}
                          <div className="hidden lg:block lg:col-span-4">
                            <div className="sticky top-0 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)] border-2 border-[rgba(217,119,6,0.14)] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-amber-400" />

                              <div className="flex items-center gap-2 mb-5">
                                <Receipt className="w-4 h-4 text-amber-600" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                                  {isAr ? 'اختياراتك الحالية' : 'Current Selection'}
                                </h3>
                              </div>

                              {totals.count === 0 ? (
                                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
                                  <ShoppingCart className="w-7 h-7 text-slate-300 mx-auto mb-3" />
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    {isAr ? 'في انتظار اختياراتك' : 'Awaiting selections'}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-5 max-h-[320px] overflow-y-auto no-scrollbar mb-5">
                                    {Object.entries(groupedItems).map(([cat, items]) => (
                                      <div key={cat} className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                          {catIcons[cat]}
                                          <span className="text-[9px] font-bold uppercase tracking-widest">{isAr ? CATEGORY_LABELS[cat] : CATEGORY_LABELS_EN[cat]}</span>
                                        </div>
                                        {items.map(item => (
                                          <div key={item.id} className="flex justify-between items-center text-xs font-medium text-slate-500">
                                            <span className="truncate pr-3 border-l-2 border-amber-200 pl-2">{isAr ? item.nameAr : item.name}</span>
                                            <span className="shrink-0 tabular-nums font-bold text-slate-800">{showPrice(item.price)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Live Rewards Inject */}
                                  {(totals.unlockedRewards.length > 0 || totals.bonusPerks.length > 0) && (
                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 mb-5 space-y-2">
                                      <div className="flex items-center gap-1.5 mb-1 text-emerald-700">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{isAr ? 'مكاسبك الحالية' : 'Current Unlocks'}</span>
                                      </div>
                                      {totals.unlockedRewards.map(r => (
                                        <div key={r.id} className={`text-[11px] font-bold flex items-center justify-between transition-all ${r.id.startsWith('egg_') ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg shadow-sm my-1' : 'text-emerald-600'}`}>
                                          <span className="flex items-center gap-1.5">
                                            {r.id.startsWith('egg_') ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                                            {isAr ? r.titleAr : r.title}
                                          </span>
                                        </div>
                                      ))}
                                      {totals.bonusPerks.map(p => (
                                        <div key={p.id} className={`text-[11px] font-bold flex items-center justify-between transition-all ${p.id.startsWith('egg_') ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-700 px-2.5 py-1.5 rounded-lg shadow-sm my-1' : 'text-emerald-700'}`}>
                                          <span className="flex items-center gap-1.5">
                                            {p.id.startsWith('egg_') ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                            {isAr ? p.titleAr : p.title}
                                            <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black ${p.id.startsWith('egg_') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                              {isAr ? 'بونص مجاني' : 'Free Add-on'}
                                            </span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                      <span className="font-medium">{isAr ? 'الإجمالي الفرعي' : 'Sub-Total'}</span>
                                      <span className="font-bold text-slate-500">{showPrice(totals.subtotal)}</span>
                                    </div>
                                    {totals.discount > 0 && (
                                      <div className="flex justify-between items-center text-xs text-indigo-600">
                                        <span className="flex items-center gap-1.5 font-medium">
                                          <Sparkles className="w-3.5 h-3.5" />
                                          {isAr ? 'خصم باقة الهوية الكاملة' : 'Full Brand Package Discount'}
                                        </span>
                                        <span className="font-bold">- {showPrice(totals.discount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center text-xs text-emerald-600">
                                      <span className="flex items-center gap-1.5 font-medium"><Zap className="w-3 h-3" /> {isAr ? 'الضريبة' : 'Tax'}</span>
                                      <span className="font-bold">0% FREE</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-400">{isAr ? 'الإجمالي' : 'Total'}</span>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums">
                                          {showPrice(totals.total)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ──────── STEP 3: YOUR INFO ──────── */}
                {step === 'details' && (
                  <motion.div key="details" {...slide} className="p-10 max-w-2xl mx-auto h-full flex flex-col justify-center">
                    <div className="flex items-center gap-5 mb-10">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <User className="w-8 h-8 text-emerald-700" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-1">
                          {isKnownClient ? (isAr ? 'الحساب والملاحظات' : 'Account & Notes') : (isAr ? 'بياناتك' : 'Your Details')}
                        </h2>
                        <p className="text-slate-400 text-sm font-medium">
                          {isKnownClient
                            ? (isAr ? 'سنستخدم بيانات حسابك الحالية، ويمكنك إضافة ملاحظات فقط.' : 'We will use your account data automatically. Add notes only if needed.')
                            : (isAr ? 'نحتاج لبياناتك لنبدأ العمل على مشروعك' : 'Share your details so we can get started.')}
                        </p>
                      </div>
                    </div>

                    {/* Loading indicator */}
                    {duplicateCheck.isLoading && !duplicateCheck.found && !isKnownClient && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                        {isAr ? 'جاري التحقق من البيانات...' : 'Checking contact information...'}
                      </div>
                    )}

                    {/* Duplicate Warning Banner */}
                    {duplicateCheck.found && !isKnownClient && (
                      <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-800">
                              {isAr ? 'البيانات مستخدمة من قبل' : 'Details already connected'}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              {isAr ? GUEST_DUPLICATE_MESSAGE_AR : GUEST_DUPLICATE_MESSAGE_EN}
                            </p>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => window.open('/track-request', '_blank')}
                                className="h-9 px-4 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:bg-slate-800"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                {isAr ? 'تتبع طلب سابق' : 'Track existing request'}
                              </button>
                              <button
                                onClick={() => {
                                  const message = isAr
                                    ? 'مرحباً، أحتاج مساعدة بخصوص طلب أو حساب سابق مرتبط ببيانات التواصل الخاصة بي.'
                                    : 'Hello, I need help with a previous request or account connected to my contact details.';
                                  window.open(`https://wa.me/201277636616?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                className="h-9 px-4 rounded-full bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(37,211,102,0.25)] hover:bg-[#20b558]"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {isAr ? 'تواصل مع Lumos' : 'Contact Lumos'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isKnownClient ? (
                      <div className="grid grid-cols-1 gap-5">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{isAr ? 'الحساب الحالي' : 'Current Account'}</p>
                          <p className="mt-2 text-lg font-black text-slate-800">{accountDisplayName}</p>
                          <p className="mt-1 text-sm text-slate-500">{isAr ? 'سيتم ربط الطلب ببروفايلك ولوحة الأدمن مباشرة.' : 'This request will be linked to your client profile and admin dashboard automatically.'}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {isAr ? 'ملاحظات إضافية' : 'Notes'}
                            </label>
                            <span className={`text-[10px] font-bold tabular-nums ${contact.notes.length > 450 ? 'text-red-400' : 'text-slate-300'}`}>
                              {contact.notes.length}/500
                            </span>
                          </div>
                          <textarea
                            value={contact.notes}
                            onChange={e => {
                              if (e.target.value.length <= 500)
                                setContact(c => ({ ...c, notes: e.target.value }));
                            }}
                            placeholder={isAr ? 'مثلاً: أريد مراجعة الباقة قبل اعتمادها، أو أولوية التنفيذ...' : 'For example: review this package before approval, urgent launch, or specific delivery notes...'}
                            rows={5}
                            className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium placeholder:text-slate-300 text-sm resize-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-5">
                          {/* Full Name */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              {isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-400">*</span>
                            </label>
                            <input
                              value={contact.name}
                              onChange={e => {
                                setContact(c => ({ ...c, name: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, name: undefined }));
                                // Real-time duplicate check when 2+ words entered
                                const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
                                if (words.length >= 2) {
                                  checkDuplicateContact(contact.phone, contact.email, e.target.value);
                                }
                              }}
                              onBlur={() => setValidationErrors(prev => ({ ...prev, name: validateName(contact.name, isAr) }))}
                              placeholder={isAr ? 'الاسم هنا...' : 'John Doe'}
                              className={`w-full bg-white border p-3.5 rounded-xl text-slate-800 outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-300 text-sm ${
                                duplicateCheck.found 
                                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                  : contact.name && !isNameValid 
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                    : contact.name && isNameValid
                                      ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                                      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                              }`}
                            />
                            {validationErrors.name && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> {validationErrors.name}
                              </p>
                            )}
                          </div>
{/* Phone */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              {isAr ? 'رقم الهاتف' : 'Phone Number'} *
                            </label>
                            <input
                              type="tel"
                              value={contact.phone}
                              onChange={e => {
                                const val = e.target.value.replace(/[^\d]/g, '').slice(0, 11);
                                setContact(c => ({ ...c, phone: val }));
                                setValidationErrors(prev => ({ ...prev, phone: undefined }));
                                // Real-time duplicate check when 11 digits reached
                                if (val.length === 11) {
                                  checkDuplicateContact(val, contact.email, contact.name);
                                }
                              }}
                              onBlur={() => setValidationErrors(prev => ({ ...prev, phone: validatePhone(contact.phone, isAr) }))}
                              placeholder={isAr ? '01XXXXXXXXX' : '01XXXXXXXXX'}
                              className={`w-full bg-white border p-3.5 rounded-xl text-slate-800 outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-300 text-sm ${
                                duplicateCheck.found 
                                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                  : contact.phone && !isPhoneValid 
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                    : contact.phone && isPhoneValid
                                      ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                                      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                              }`}
                              required
                            />
                            {validationErrors.phone && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> {validationErrors.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-5">
                          {/* Email */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              {isAr ? 'البريد الإلكتروني' : 'Email'}
                            </label>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={e => {
                                setContact(c => ({ ...c, email: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, email: undefined }));
                                // Real-time duplicate check when email contains @
                                if (e.target.value.includes('@')) {
                                  checkDuplicateContact(contact.phone, e.target.value, contact.name);
                                }
                              }}
                              onBlur={() => contact.email && setValidationErrors(prev => ({ ...prev, email: validateEmail(contact.email, isAr) }))}
                              placeholder="you@company.com"
                              className={`w-full bg-white border p-3.5 rounded-xl text-slate-800 outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-300 text-sm ${
                                duplicateCheck.found 
                                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                  : contact.email && !isEmailValid 
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                    : contact.email && isEmailValid
                                      ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                                      : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                              }`}
                            />
                            {validationErrors.email && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> {validationErrors.email}
                              </p>
                            )}
                          </div>
                          {/* Notes with counter */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {isAr ? 'ملاحظات إضافية' : 'Notes'}
                              </label>
                              <span className={`text-[10px] font-bold tabular-nums ${contact.notes.length > 450 ? 'text-red-400' : validationErrors.notes ? 'text-red-400' : 'text-slate-300'}`}>
                                {contact.notes.length}/500
                              </span>
                            </div>
                            <textarea
                              value={contact.notes}
                              onChange={e => {
                                if (e.target.value.length <= 500) {
                                  setContact(c => ({ ...c, notes: e.target.value }));
                                  setValidationErrors(prev => ({ ...prev, notes: undefined }));
                                }
                              }}
                              onBlur={() => contact.notes && setValidationErrors(prev => ({ ...prev, notes: validateNotes(contact.notes, isAr) }))}
                              placeholder={isAr ? 'أي شيء تود إخبارنا به...' : 'Specific requirements...'}
                              rows={3}
                              className={`w-full bg-white border p-3.5 rounded-xl text-slate-800 outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-300 text-sm resize-none ${
                                contact.notes && !isNotesValid 
                                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100' 
                                  : contact.notes && isNotesValid
                                    ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                                    : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                              }`}
                            />
                            {validationErrors.notes && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> {validationErrors.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ──────── STEP 4: SUMMARY (DETAILED INVOICE) ──────── */}
                {step === 'summary' && (
                  <motion.div key="summary" {...slide} className="p-6 sm:p-10 max-w-2xl mx-auto h-full overflow-y-auto no-scrollbar">
                    <div className="text-center mb-8">
                      {isEditing && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold tracking-widest uppercase mb-4 border border-cyan-200">
                          <RefreshCw className="w-3 h-3" /> {isAr ? 'وضع تعديل الطلب' : 'Edit Request Mode'}
                        </div>
                      )}
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                        {isEditing ? (isAr ? 'ملخص التحديث' : 'Updated Request Summary') : (isAr ? 'ملخص الفاتورة' : 'Invoice Summary')}
                      </h2>
                      <p className="text-slate-400 text-sm font-medium">
                        {isEditing
                          ? (isAr ? 'راجع العناصر بعد الإضافة أو الحذف قبل إعادة الإرسال' : 'Review the updated scope before resubmitting')
                          : (isAr ? 'راجع كل الخدمات اللي اخترتها' : 'Review all selected services before confirming')}
                      </p>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
                      <div className="p-6 space-y-6">
                        {Object.entries(groupedItems).map(([cat, items]) => (
                          <div key={cat} className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <span className="text-slate-400">{catIcons[cat]}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {isAr ? CATEGORY_LABELS[cat] : CATEGORY_LABELS_EN[cat]}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {items.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                  <span className="text-slate-700 font-medium">{isAr ? item.nameAr : item.name}</span>
                                  <span className="text-slate-500 tabular-nums font-bold">{showPrice(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {mode === 'packages' && selectedPkg && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <PackageIcon className="w-3.5 h-3.5 text-cyan-500" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {isAr ? 'الباقة المختارة' : 'Selected Package'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-800 font-bold">{isAr ? Object.values(PACKAGES).find(p => p.id === selectedPkg)?.nameAr : Object.values(PACKAGES).find(p => p.id === selectedPkg)?.name}</span>
                              <span className="text-cyan-600 font-black tabular-nums">{showPrice(totals.total)}</span>
                            </div>
                          </div>
                        )}

                        {mode === 'custom' && selectedCustomItems.length > 0 && (
                          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {isAr ? 'تفاصيل الخطة المخصصة' : 'Custom Plan Details'}
                              </span>
                              <span className="text-xs font-semibold text-cyan-600">{selectedCustomItems.length} {isAr ? 'عنصر' : 'items'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedCustomItems.map(item => (
                                <span key={item.id} className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                  {isAr ? item.nameAr : item.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {contact.notes.trim() && (
                          <div className="space-y-2 rounded-2xl border border-slate-100 bg-white/70 p-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {isAr ? 'ملاحظاتك' : 'Your Notes'}
                            </span>
                            <p className="text-sm leading-6 text-slate-600">{contact.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-6 border-t border-slate-100 space-y-3">
                        {/* ── Unlocked Rewards & Perks ── */}
                        {(totals.unlockedRewards.length > 0 || totals.bonusPerks.length > 0) && (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 mb-4 space-y-2">
                            <div className="flex items-center gap-1.5 mb-2 text-emerald-700">
                              <Sparkles className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'مكاسبك الحالية' : 'Unlocked Rewards'}</span>
                            </div>
                            {totals.unlockedRewards.map(r => (
                              <div key={r.id} className={`text-xs font-bold flex items-center justify-between transition-all ${r.id.startsWith('egg_') ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl shadow-sm my-1' : 'text-emerald-600'}`}>
                                <span className="flex items-center gap-2">
                                  {r.id.startsWith('egg_') ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                  {isAr ? r.titleAr : r.title}
                                </span>
                              </div>
                            ))}
                            {totals.bonusPerks.map(p => (
                              <div key={p.id} className={`text-xs font-bold flex items-center justify-between transition-all ${p.id.startsWith('egg_') ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl shadow-sm my-1' : 'text-emerald-700'}`}>
                                <span className="flex items-center gap-2">
                                  {p.id.startsWith('egg_') ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                  {isAr ? p.titleAr : p.title}
                                  <span className={`ml-2 text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-black ${p.id.startsWith('egg_') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isAr ? 'بونص مجاني' : 'Free Add-on'}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Subtotal ── */}
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span className="font-medium">{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                          <span className="font-bold text-slate-500 tabular-nums">{showPrice(totals.subtotal)}</span>
                        </div>

                        {/* ── Base Discount (Brand Identity or Package Offer) ── */}
                        {totals.discount > totals.promoDiscountValue && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                              <Sparkles className="w-3.5 h-3.5" />
                              {mode === 'custom'
                                ? (isAr ? 'خصم باقة الهوية الكاملة' : 'Brand Bundle Discount')
                                : (isAr ? 'عرض 3 شهور (-10%)' : '3-Months Offer (-10%)')}
                            </span>
                            <span className="font-bold text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 tabular-nums">
                              - {showPrice(totals.discount - totals.promoDiscountValue)}
                            </span>
                          </div>
                        )}

                        {/* ── Promo code discount ── */}
                        {appliedPromo && totals.promoDiscountValue > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                              <Zap className="w-3.5 h-3.5" />
                              {isAr ? 'كود خصم' : 'Promo Code'}: <span className="font-black tracking-widest">{appliedPromo.code}</span>
                            </span>
                            <span className="font-bold text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 tabular-nums">
                              - {showPrice(totals.promoDiscountValue)}
                            </span>
                          </div>
                        )}

                        {/* ── Promo Code Input ── */}
                        <div className={`rounded-xl border-2 p-3.5 transition-all ${appliedPromo ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                          {appliedPromo ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-emerald-700 tracking-widest">{appliedPromo.code}</p>
                                  <p className="text-[10px] text-emerald-600 font-medium">
                                    {appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}% ${isAr ? 'خصم' : 'off'}` : `${showPrice(appliedPromo.discount_value)} ${isAr ? 'خصم' : 'off'}`}
                                  </p>
                                </div>
                              </div>
                              <button onClick={removePromo} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider">
                                {isAr ? 'إزالة' : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && void handleApplyPromo()}
                                placeholder={isAr ? 'كود الخصم...' : 'PROMO CODE'}
                                inputMode="text"
                                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-800 text-xs font-black tracking-widest outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-300 placeholder:tracking-normal"
                              />
                              <button
                                onClick={() => void handleApplyPromo()}
                                disabled={isCheckingPromo || !promoCode.trim()}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                {isCheckingPromo ? '...' : (isAr ? 'تطبيق' : 'Apply')}
                              </button>
                            </div>
                          )}
                          {promoError && (
                            <p className="text-red-500 text-[10px] font-medium mt-2">⚠ {promoError}</p>
                          )}
                        </div>

                        {/* ── Tax ── */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">{isAr ? 'الضريبة' : 'Tax'}</span>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">{isAr ? 'بدون ضريبة ✓' : '0% Tax Free ✓'}</span>
                        </div>

                        {/* ── Total ── */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                          <span className="text-sm font-bold text-slate-500">{isAr ? 'الإجمالي' : 'Total Amount'}</span>
                          <div className="text-3xl font-black text-slate-900 tabular-nums">
                            {showPrice(totals.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ──────── STEP 5: FINAL CONFIRMATION ──────── */}
                {step === 'review' && (
                  <motion.div key="review" {...slide} className="p-8 sm:p-12 max-w-2xl mx-auto h-full flex flex-col justify-center">
                    <div className="text-center mb-8">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border ${isEditing ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {isEditing ? <RefreshCw className="w-3 h-3" /> : <Shield className="w-3 h-3" />} {isEditing ? (isAr ? 'جاهز لإعادة الإرسال' : 'Ready to Resubmit') : (isAr ? 'جاهز للإرسال' : 'Ready to Submit')}
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-2">
                        {isEditing ? (isAr ? 'تأكيد التعديل' : 'Confirm Update') : (isAr ? 'آخر خطوة' : 'Final Confirmation')}
                      </h2>
                      <p className="text-slate-400 text-sm font-medium">
                        {isEditing
                          ? (isAr ? 'سيتم تحديث نفس الطلب داخل حسابك ولوحة الأدمن.' : 'The same request will be updated in your account and admin dashboard.')
                          : (isAr ? 'راجع طلبك قبل الإرسال لفريقنا' : 'Review your order before sending it to our team.')}
                      </p>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
                      <div className="space-y-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{isAr ? 'الباقة / الخدمات' : 'Package / Services'}</span>
                            {mode === 'packages' ? (
                              <h3 className="text-xl font-black text-slate-900">{isAr ? Object.values(PACKAGES).find(p => p.id === selectedPkg)?.nameAr : Object.values(PACKAGES).find(p => p.id === selectedPkg)?.name}</h3>
                            ) : (
                              <h3 className="text-xl font-black text-slate-900">{totals.count} {isAr ? 'خدمة مختارة' : 'Services Selected'}</h3>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">{isAr ? 'الإجمالي' : 'Total'}</span>
                            <div className="text-2xl font-black text-slate-900 tabular-nums">{showPrice(totals.total)}</div>
                          </div>
                        </div>

                        <div className="h-px bg-muted" />

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isKnownClient ? (isAr ? 'الحساب' : 'Account') : (isAr ? 'بيانات التواصل' : 'Contact')}</span>
                            <p className="text-sm font-bold text-slate-800">{isKnownClient ? accountDisplayName : contact.name}</p>
                            <p className="text-xs text-slate-400 tabular-nums mt-0.5">{isKnownClient ? (isAr ? 'سيُربط الطلب ببروفايل العميل مباشرة' : 'This request will sync directly to the client profile') : contact.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isAr ? 'وقت الاستجابة' : 'Response Time'}</span>
                            <p className="text-sm font-bold text-cyan-600">{isKnownClient ? (isAr ? 'تظهر داخل حسابك بعد الإرسال' : 'Visible in your account after submit') : (isAr ? 'خلال 24 ساعة' : 'Within 24 Hours')}</p>
                          </div>
                        </div>

                        <div className="h-px bg-muted" />

                        {mode === 'custom' && selectedCustomItems.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">{isAr ? 'العناصر المختارة' : 'Selected Items'}</span>
                            <div className="flex flex-wrap gap-2">
                              {selectedCustomItems.map(item => (
                                <span key={item.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {isAr ? item.nameAr : item.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {contact.notes.trim() && (
                          <>
                            <div className="h-px bg-muted" />
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{isAr ? 'الملاحظات' : 'Notes'}</span>
                              <p className="text-sm leading-6 text-slate-600">{contact.notes}</p>
                            </div>
                          </>
                        )}

                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-medium">{isKnownClient ? (isEditing ? (isAr ? 'سيتم تحديث الطلب الحالي في حسابك ولوحة الأدمن للمتابعة' : 'Your existing request will be updated in your client profile and admin dashboard') : (isAr ? 'يتم حفظ الطلب في حسابك ولوحة الأدمن للمتابعة' : 'Saved to your client profile and admin dashboard for follow-up')) : (isAr ? 'يتم الإرسال عبر واتساب مع نسخة في لوحة التحكم' : 'Sent via WhatsApp + saved to dashboard')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

{/* ──────── STEP 6: SUCCESS / TRACKING (NEW TIMELINE UI) ──────── */}
                {step === 'success' && (() => {
                  const activeReq = submittedRequest || latestClientRequest || guestTrackingResult?.request || null;
                  const isTrackingMode = savedPendingRequest && !submittedRequest && !latestClientRequest && !guestTrackingResult;
                  
                  const currentRequest = (isTrackingMode ? savedPendingRequest : activeReq) as ActiveRequestSnapshot | null;
                  const currentStatus = currentRequest?.status || 'new';
                  const invoiceNumber = guestTrackingResult?.request.invoice_number
                    || (activeReq as PricingRequest | GuestTrackedRequest | null)?.invoice_number
                    || savedPendingRequest?.invoiceNumber
                    || null;
                  const trackingPortalUrl = guestTrackingResult?.trackingUrl
                    || (invoiceNumber ? buildGuestTrackingUrl(invoiceNumber) : '/track-request');
                  
                  const currentEditCount = isTrackingMode 
                    ? (savedPendingRequest?.editCount || 0) 
                    : (requestEditCount[currentRequest?.id] || 0);
                  const remainingEdits = Math.max(0, 3 - currentEditCount);
                  
                  const isGuestResult = Boolean(guestTrackingResult || isTrackingMode);
                  const canEdit = ['new', 'reviewing'].includes(currentStatus) && remainingEdits > 0 && !isGuestResult;
                  const canCancel = ['new', 'reviewing'].includes(currentStatus) && !isGuestResult;
                  
                  const getStepStatus = (stepName: string) => {
                    const statusOrder = ['new', 'reviewing', 'approved', 'converted'];
                    const currentIdx = statusOrder.indexOf(currentStatus);
                    const stepIdx = statusOrder.indexOf(stepName);
                    
                    if (currentStatus === 'rejected') {
                      if (stepIdx <= 1) return 'completed';
                      return 'pending';
                    }
                    if (currentStatus === 'cancelled') {
                      return stepName === 'new' ? 'completed' : 'pending';
                    }
                    
                    if (stepIdx < currentIdx) return 'completed';
                    if (stepIdx === currentIdx) return 'current';
                    return 'pending';
                  };

                  const timelineSteps = [
                    { key: 'new', label: isAr ? 'تم استلام الطلب' : 'Order Received', subLabel: isAr ? 'تم تسجيل طلبك بنجاح' : 'Your order has been registered' },
                    { key: 'reviewing', label: isAr ? 'جاري المراجعة' : 'Under Review', subLabel: isAr ? 'الفريق يفحص تفاصيل طلبك' : 'Team is reviewing your details' },
                    { key: 'approved', label: isAr ? 'تأكيد وبدء العمل' : 'Approved & Started', subLabel: isAr ? 'تم اعتماد الطلب وسيبدأ العمل' : 'Order approved, work begins soon' },
                    { key: 'converted', label: isAr ? 'تسليم المشروع' : 'Project Delivery', subLabel: isAr ? 'سيتم تسليم المشروع النهائي' : 'Final project will be delivered' },
                  ];

                  return (
                    <motion.div 
                      key="success" 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 sm:p-10 max-w-xl mx-auto h-full flex flex-col justify-center overflow-y-auto"
                    >
                      {/* ════ TOP SECTION: ORDER HEADER ════ */}
                      <div className="text-center mb-8">
                        <motion.div 
                          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 mx-auto border-4 border-emerald-200"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </motion.div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
                          {isAr ? 'طلبك في أمان!' : 'Your Order is Safe!'}
                        </h2>
                        <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-1">
                          <span>{isAr ? 'رقم الفاتورة: ' : 'Invoice: '}</span>
                          <span className="font-mono text-slate-600">{invoiceNumber || 'N/A'}</span>
                          <button
                            onClick={() => {
                              setIsCopying(true);
                              navigator.clipboard.writeText(invoiceNumber || '');
                              setTimeout(() => setIsCopying(false), 1500);
                            }}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                          >
                            {isCopying ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </p>
                      </div>

                      {/* ════ MIDDLE SECTION: TIMELINE ════ */}
                      <div className="relative mb-8">
                        {timelineSteps.map((step, idx) => {
                          const status = getStepStatus(step.key);
                          const isLast = idx === timelineSteps.length - 1;
                          
                          return (
                            <div key={step.key} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <motion.div 
                                  className={`w-5 h-5 rounded-full border-2 z-10 ${
                                    status === 'completed' 
                                      ? 'bg-emerald-500 border-emerald-500' 
                                      : status === 'current'
                                        ? 'bg-purple-500 border-purple-500 animate-pulse'
                                        : 'bg-white border-slate-300'
                                  }`}
                                  animate={status === 'current' ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                  {status === 'completed' && <Check className="w-3 h-3 text-white m-0.5" />}
                                </motion.div>
                                {!isLast && (
                                  <div className={`w-0.5 h-12 ${status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                )}
                              </div>
                              <div className="pb-6">
                                <p className={`text-sm font-bold ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                                  {step.label}
                                </p>
                                <p className={`text-xs ${status === 'pending' ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {step.subLabel}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ════ BOTTOM SECTION: ORDER SUMMARY CARD ════ */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {isAr ? 'الباقة' : 'Package'}
                            </p>
                            <p className="font-bold text-slate-800">{isTrackingMode ? savedPendingRequest?.packageName : (selectedPkg ? Object.values(PACKAGES).find(p => p.id === selectedPkg)?.nameEn : (isAr ? 'باقة مخصصة' : 'Custom Plan'))}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {isAr ? 'المبلغ الإجمالي' : 'Total Amount'}
                            </p>
                            <p className="font-bold text-slate-800">
                              {(isTrackingMode ? savedPendingRequest?.estimatedTotal : totals.total)?.toLocaleString()} {isTrackingMode ? savedPendingRequest?.currency : currency}
                            </p>
                          </div>
                          {contact.phone && (
                            <div className="col-span-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                {isAr ? 'رقم الهاتف' : 'Phone'}
                              </p>
                              <p className="font-bold text-slate-800">{contact.phone}</p>
                            </div>
)}
                        </div>
                      </div>

                      {guestTrackingResult && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                            {isAr ? 'رابط التتبع الآمن' : 'Secure tracking access'}
                          </p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">
                                {isAr ? 'كود التتبع' : 'Tracking code'}
                              </p>
                              <p className="mt-1 break-all font-mono text-sm font-black text-slate-900">
                                {guestTrackingResult.trackingKey}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">
                                {isAr ? 'الرابط' : 'Link'}
                              </p>
                              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                                {guestTrackingResult.trackingUrl}
                              </p>
                            </div>
                            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                              {isAr
                                ? 'احفظ رابط التتبع ده. بدون تحقق بالبريد، Lumos لا تستطيع استعادة وصول التتبع تلقائياً.'
                                : 'Save this tracking link. Without email verification, Lumos cannot recover this guest tracking access automatically.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {isTrackingMode && !guestTrackingResult && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                          <p className="text-sm font-semibold text-amber-800">
                            {isAr
                              ? 'البيانات هنا محفوظة محلياً للراحة فقط. افتح بوابة التتبع وأدخل كود التتبع لعرض الطلب أو تعديله.'
                              : 'This local snapshot is only a convenience. Open the tracking portal and enter the tracking code to view or change the request.'}
                          </p>
                        </div>
                      )}

                      {/* ════ ADMIN NOTE SECTION (If exists) ════ */}
                      {currentRequest?.admin_notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
                                {isAr ? 'ملاحظة من الإدارة' : 'Note from Admin'}
                              </p>
                              <p className="text-sm font-medium text-slate-800">
                                {currentRequest.admin_notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 justify-center">
                        {isGuestResult && (
                          <button
                            onClick={() => {
                              setIsCopying(true);
                              navigator.clipboard.writeText(trackingPortalUrl);
                              setTimeout(() => setIsCopying(false), 1500);
                              toast.success(isAr ? 'تم نسخ رابط التتبع' : 'Tracking link copied');
                            }}
                            className="h-10 px-5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:from-emerald-700 hover:to-teal-700"
                          >
                            {isCopying ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {isAr ? 'نسخ رابط التتبع' : 'Copy tracking link'}
                          </button>
                        )}

                        {isGuestResult && (
                          <button
                            onClick={() => {
                              window.location.href = trackingPortalUrl;
                            }}
                            className="h-10 px-5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:bg-slate-800"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            {isAr ? 'فتح التتبع' : 'Track request'}
                          </button>
                        )}

                        {isGuestResult && (
                          <button
                            onClick={() => {
                              window.location.href = '/client-signup';
                            }}
                            className="h-10 px-5 rounded-full bg-white text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm hover:bg-slate-50"
                          >
                            <User className="w-3.5 h-3.5" />
                            {isAr ? 'إنشاء حساب' : 'Create account'}
                          </button>
                        )}
                        
                        {canEdit && (
                          <button
                            onClick={handleEditRequest}
                            className="h-10 px-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:from-amber-600 hover:to-orange-600"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {isAr ? `تعديل الطلب (${remainingEdits}/3)` : `Edit (${remainingEdits}/3 left)`}
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={handleCancelRequest}
                            className="h-10 px-5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:from-rose-600 hover:to-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                            {isAr ? 'إلغاء الطلب' : 'Cancel Request'}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const message = invoiceNumber
                              ? (isAr
                                ? `مرحباً، أريد الاستفسار عن طلب رقم ${invoiceNumber}`
                                : `Hello, I want to ask about request ${invoiceNumber}`)
                              : (isAr ? 'مرحباً، أريد الاستفسار عن طلبي.' : 'Hello, I want to ask about my request.');
                            window.open(`https://wa.me/201277636616?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="h-10 px-5 rounded-full bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(37,211,102,0.35)] hover:bg-[#20b558]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isAr ? 'تواصل مع Lumos' : 'Contact Lumos'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* ── Easter Egg Popup Overlay ── */}
                {showEasterEggModal && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] flex items-center justify-center p-4"
                  >
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" onClick={() => setShowEasterEggModal(false)} />
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="relative w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border border-emerald-100 overflow-hidden"
                    >
                      <button onClick={() => setShowEasterEggModal(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>

                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 mx-auto border border-emerald-100">
                        <Sparkles className="w-7 h-7 text-emerald-500" />
                      </div>

                      <h3 className="text-xl font-black text-center text-slate-800 mb-2">
                        {isAr ? 'عذرًا على المقاطعة.. مكافأة سرية بانتظارك!' : 'Pardon the interruption... A secret bonus awaits!'}
                      </h3>

                      <AnimatePresence mode="wait">
                        {!easterEggStage1Unlocked ? (
                          <motion.div key="stage1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <p className="text-sm text-center text-slate-500 font-medium mb-6">
                              {isAr ? 'هل تعرف ما هو مصدر إلهام اسم "لوموس"؟' : 'Do you know the inspiration behind the name Lumos?'}
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {[
                                isAr ? 'تعويذة من هاري بوتر' : 'A spell from Harry Potter',
                                isAr ? 'مصطلح لاتيني في التصميم' : 'A Latin design term',
                                isAr ? 'إطار عمل للعلامات التجارية' : 'A branding framework',
                                isAr ? 'تقنية تحريك في الويب' : 'A web animation technique'
                              ].map((ans, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (idx === 0) {
                                      setEasterEggStage1Unlocked(true);
                                      toast.success(isAr ? 'إجابة صحيحة ✨ اكتمل الجزء الأول' : 'Correct ✨ First part unlocked', { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } });
                                    } else {
                                      toast(isAr ? 'محاولة جيدة. مكافآت الإطلاق الخاصة بك لا تزال متاحة.' : 'Not quite — but your package rewards are still active.', { style: { background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9' }, duration: 2000 });
                                      setShowEasterEggModal(false);
                                    }
                                  }}
                                  className="w-full text-center px-4 py-3.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 hover:text-emerald-700 hover:shadow-sm transition-all text-slate-600"
                                >
                                  {ans}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        ) : !easterEggStage2Unlocked ? (
                          <motion.div key="stage2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center pt-2">
                            <p className="text-sm font-semibold text-slate-600 mb-5 text-center px-4">
                              {isAr ? 'ممتاز! الآن اكتب التعويذة المطورة بالكامل لفتح المكافأة...' : 'Excellent! Now, type the fully upgraded spell to unlock your reward...'}
                            </p>
                            <input
                              type="text"
                              autoFocus
                              placeholder={isAr ? 'مثال: تعويذة هاري بوتر الكبرى...' : 'e.g., The upgraded spell...'}
                              className="text-center text-sm px-5 py-3.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none w-full max-w-[260px] transition-all bg-slate-50 focus:bg-white mb-2"
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase().trim();
                                if (val === 'lumos maxima') {
                                  setEasterEggStage2Unlocked(true);
                                  toast.success(isAr ? 'تم فتح المكافأة السرية ✨' : 'Secret bonus unlocked ✨', { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } });
                                  setTimeout(() => setShowEasterEggModal(false), 2500);
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.toLowerCase().trim();
                                if (val.length > 3 && val !== 'lumos maxima') {
                                  toast(isAr ? 'اقتربت جداً. جرب التعويذة المطورة كاملة.' : 'Almost there. Try the full upgraded spell.', { style: { background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9' }, duration: 2000 });
                                }
                              }}
                            />
                          </motion.div>
                        ) : (
                          <motion.div key="stage3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center pt-2 pb-2">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                              <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-center text-slate-700">
                              {isAr ? 'تهانينا! تمت إضافة كل جوائز لوموس السرية للفاتورة بنجاح.' : 'Congratulations! All secret Lumos bonuses have been added to your receipt.'}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ════ FOOTER ════ */}
            <footer className="relative z-20 shrink-0 px-6 py-3.5 border-t border-[rgba(17,94,69,0.10)] bg-[linear-gradient(180deg,rgba(255,253,247,0.98)_0%,rgba(245,250,246,0.98)_100%)] backdrop-blur-xl flex items-center justify-between gap-4">
              {step !== 'mode' ? (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-all group"
                >
                  <ArrowLeft className={`w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform ${isAr ? 'rotate-180' : ''}`} />
                  {isAr ? 'رجوع' : 'Back'}
                </button>
              ) : <div />}

              <div className="flex items-center gap-5">
                {(step === 'build' || step === 'details' || step === 'summary') && (
                  <div className="hidden sm:block text-right">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isAr ? 'الإجمالي' : 'Total'}</span>
                    <div className="text-lg font-black text-slate-900 tabular-nums leading-none">
                      <AnimatedPrice value={isEgypt ? totals.total : convertPrice(totals.total)} />
                      <span className="text-[10px] text-slate-400 ms-1 font-bold">{currencySymbol}</span>
                    </div>
                  </div>
                )}

                {(step === 'build' || step === 'details' || step === 'summary') && (
                  <button
                    onClick={goNext}
                    disabled={!canProceed}
                    title={nextButtonTitle}
                    className="h-10 px-7 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest hover:from-emerald-700 hover:to-teal-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md shadow-emerald-200"
                  >
                    {isAr ? 'التالي' : 'Next'} <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {step === 'review' && (
                  <button
                    onClick={handleConfirm}
                    disabled={sending}
                    className="h-10 px-8 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700"
                  >
                    {sending ? (
                      <span className="animate-pulse">{isAr ? 'جاري...' : 'Sending...'}</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {isAr ? 'تأكيد وإرسال' : 'Confirm & Send'}
                      </>
                    )}
                  </button>
                )}

                {step === 'success' && (
                  <div className="flex gap-3">
                    {/* WhatsApp Contact Button */}
                    <button
                      onClick={() => window.open(`https://wa.me/201277636616?text=${encodeURIComponent(buildMessage())}`, '_blank')}
                      className="h-10 px-5 rounded-full bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(37,211,102,0.35)] hover:bg-[#20b558] hover:shadow-[0_6px_24px_rgba(37,211,102,0.45)]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isAr ? 'تواصل معنا' : 'Contact Us'}
                    </button>
                    
                    {/* Close Button */}
                    <button
                      onClick={() => onOpenChange(false)}
                      className="h-10 px-5 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:from-slate-700 hover:to-slate-800"
                    >
                      {isAr ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                )}
              </div>
            </footer>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default PricingModal;
