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
  Megaphone, Bot, Settings2, TrendingUp, Lock, ArrowLeft,
  Receipt, Calculator, Package as PackageIcon, MessageSquare,
  User, Phone, Mail, FileText, Sparkles, Zap, Palette, RefreshCw
} from 'lucide-react';
import {
  PACKAGES, SERVICES, CATEGORIES,
  CATEGORY_LABELS, CATEGORY_LABELS_EN,
  getAllServices,
} from '@/data/pricing';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { validateDiscountCode, DiscountCode } from '@/services/discountService';
import { submitContactForm } from '@/services/submissionService';
import { submitPricingRequest } from '@/services/pricingRequestService';
import { calculatePricing } from '@/lib/pricingEngine';
import { toast } from 'sonner';
import type { PricingRequest } from '@/types/dashboard';
import { useLanguage } from '@/context/LanguageContext';
import { VerifiedPhoneInput } from '@/components/shared/VerifiedPhoneInput';
import { AnimatedPrice, isValidPhoneNumber, slide } from '@/components/pricing/pricingHelpers';


// ── Types ──────────────────────────────────────────────────────────
interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRequest?: PricingRequest | null;
}

type Step = 'mode' | 'build' | 'details' | 'summary' | 'review';
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
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const PricingModal = ({ open, onOpenChange, initialRequest = null }: PricingModalProps) => {
  const { client, isAuthenticated, isAdmin } = useAuth();
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
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [sending, setSending] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';
  const isKnownClient = isAuthenticated && !isAdmin && !!client?.id;

  /* ── Sync geo language ── */
  useEffect(() => {
    if (!open) return;
    setLang(language);
  }, [language, open]);

  useEffect(() => {
    if (!geoLoading && geoLang && !open) setLang(geoLang as 'ar' | 'en');
  }, [geoLoading, geoLang, open]);

  useEffect(() => {
    setLanguage(lang);
  }, [lang, setLanguage]);

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

  const selectedPackageName = useMemo(() => {
    if (!selectedPkg) return null;
    const pkg = Object.values(PACKAGES).find(p => p.id === selectedPkg);
    if (!pkg) return null;
    return isAr ? pkg.nameAr : pkg.name;
  }, [isAr, selectedPkg]);

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

  const goNext = useCallback(() => {
    if (step === 'build') {
      if ((mode === 'packages' && !selectedPkg) || (mode === 'custom' && selectedServices.size === 0)) {
        toast.error(isAr ? 'اختر باقة أو خدمة واحدة على الأقل للمتابعة.' : 'Please select a package or at least one service to continue.');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      const emailOk = !contact.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);
      if (!isKnownClient && (!contact.name.trim() || !isValidPhoneNumber(contact.phone) || !emailOk)) {
        toast.error(isAr ? 'أكمل بيانات التواصل بشكل صحيح قبل المتابعة.' : 'Please complete valid contact details before continuing.');
        return;
      }
      setStep('summary');
    } else if (step === 'summary') {
      setStep('review');
    }
    scrollTop();
  }, [step, mode, selectedPkg, selectedServices, contact, scrollTop, isKnownClient, isAr]);

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
      const result = await submitPricingRequest({
        requestId: editingRequestId,
        clientId: client.id,
        requestType: mode === 'packages' ? 'package' : 'custom',
        packageId: mode === 'packages' ? selectedPkg : null,
        packageName: mode === 'packages' ? selectedPackageName : 'Custom Plan',
        selectedServices: totals.items,
        estimatedSubtotal: totals.subtotal,
        estimatedTotal: totals.total,
        priceCurrency: currency || 'EGP',
        requestNotes: contact.notes,
      });

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
      await submitPricingRequest({
        requestId: editingRequestId,
        requestType: mode === 'packages' ? 'package' : 'custom',
        packageId: mode === 'packages' ? selectedPkg : null,
        packageName: mode === 'packages' ? selectedPackageName : 'Custom Plan',
        selectedServices: totals.items,
        estimatedSubtotal: totals.subtotal,
        estimatedTotal: totals.total,
        priceCurrency: currency || 'EGP',
        requestNotes: contact.notes,
        guestContact: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
        },
        locationUrl: window.location.href,
      });

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
  }, [buildMessage, client?.id, contact, currency, editingRequestId, isAr, isEditing, isKnownClient, mode, onOpenChange, selectedPackageName, selectedPkg, totals]);


  /* ── Step config ── */
  const stepsList: { key: Step; en: string; ar: string }[] = useMemo(() => [
    { key: 'mode', en: 'Mode', ar: 'البداية' },
    { key: 'build', en: 'Service', ar: 'الخدمة' },
    { key: 'details', en: isKnownClient ? 'Notes' : 'Contact', ar: isKnownClient ? 'ملاحظات' : 'بياناتك' },
    { key: 'summary', en: 'Receipt', ar: 'الفاتورة' },
    { key: 'review', en: 'Confirm', ar: 'تأكيد' },
  ], [isKnownClient]);

  const currentIdx = stepsList.findIndex(s => s.key === step);

  const isEmailValid = !contact.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);

  const canProceed = step === 'build'
    ? (mode === 'packages' ? !!selectedPkg : selectedServices.size > 0)
    : step === 'details'
      ? (isKnownClient ? true : !!(contact.name.trim() && isValidPhoneNumber(contact.phone) && isEmailValid))
      : true;

  const nextButtonTitle = !canProceed && step === 'details'
    ? (!contact.name.trim() ? (isAr ? 'الاسم مطلوب' : 'Name is required')
      : !isValidPhoneNumber(contact.phone) ? (isAr ? 'رقم الهاتف غير صحيح' : 'Invalid phone number')
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
                    onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
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
                              onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                              placeholder={isAr ? 'الاسم هنا...' : 'John Doe'}
                              className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium placeholder:text-slate-300 text-sm"
                            />
                          </div>
                          {/* Phone */}
                          <div>
                            <VerifiedPhoneInput
                              label={isAr ? 'رقم الهاتف' : 'Phone Number'}
                              value={contact.phone}
                              onChange={(phone) => setContact(c => ({ ...c, phone }))}
                              onVerify={(phone) => {
                                setContact(c => ({ ...c, phone }));
                                setIsPhoneVerified(true);
                              }}
                              isArabic={isAr}
                              required
                            />
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
                              onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                              placeholder="you@company.com"
                              className={`w-full bg-white border ${contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'} p-3.5 rounded-xl text-slate-800 outline-none focus:ring-2 transition-all font-medium placeholder:text-slate-300 text-sm`}
                            />
                            {contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                              <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> {isAr ? 'بريد إلكتروني غير صحيح' : 'Invalid email address'}
                              </p>
                            )}
                          </div>
                          {/* Notes with counter */}
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
                              placeholder={isAr ? 'أي شيء تود إخبارنا به...' : 'Specific requirements...'}
                              rows={3}
                              className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all font-medium placeholder:text-slate-300 text-sm resize-none"
                            />
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
                    onClick={handleSend}
                    disabled={sending}
                    className={`h-10 px-7 rounded-full text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2 ${isKnownClient ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:from-emerald-700 hover:to-teal-700' : 'bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.35)] hover:bg-[#20b558] hover:shadow-[0_6px_24px_rgba(37,211,102,0.45)]'}`}
                  >
                    {sending ? (
                      <span className="animate-pulse">{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                    ) : (
                      <>
                        {isKnownClient ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        {isKnownClient ? (isEditing ? (isAr ? 'تحديث الطلب' : 'Update Request') : (isAr ? 'إرسال للمراجعة' : 'Send For Review')) : (isAr ? 'تأكيد عبر واتساب' : 'Send via WhatsApp')}
                      </>
                    )}
                  </button>
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
