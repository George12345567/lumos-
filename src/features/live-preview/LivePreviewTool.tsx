import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Smartphone, ArrowRight, CheckCircle2, Search, ShoppingCart,
  User, Plus, Star, Clock, Flame, Palette, ChevronDown, ChevronUp,
  X, Coffee, Scissors, Pill, Store, Building2, Download, Share2, BarChart3,
  QrCode, TrendingUp, Eye, Heart, Bell, MapPin,
  Moon, Sun, ZoomIn, Bookmark, Copy, Layers,
  Briefcase, Save, FileDown, Minus,
  RotateCcw, Wand2, Ratio,
  ExternalLink, Wifi, Battery, Signal, Leaf, Zap as ZapIcon, Crown, ThumbsUp, Award,
  Loader2, LogIn, CloudOff, Cloud, Lock, Info
} from "lucide-react";
const QRCodeSVG = lazy(() => import("qrcode.react").then(m => ({ default: m.QRCodeSVG })));
import { toast } from "sonner";
import type { MenuItem, ServiceType, Theme } from "@/types";
import { baseThemes, defaultItemsByServiceType, serviceTypesConfig } from "./constants";
import {
  TEMPLATES,
  type ButtonStyle,
  type CardStyle,
  type CategoryStyle,
  type FeaturedStyle,
  type HeaderStyle,
  type NavPlacement,
  type NavStyle,
  type PriceStyle,
  type SearchStyle,
  type StatsStyle,
  type TemplateType as TmplType,
} from "./templates";
import { copyToClipboard } from "./utils/clipboard";
import { saveDesign, updateDesign } from "@/services/designService";
import type { SaveDesignPayload } from "@/services/designService";
import { useClient, useIsAuthenticated } from "@/context/AuthContext";
import AddItemModal from "./components/AddItemModal";
import SyncOrb from "./components/SyncOrb";
import FloatingDock from "@/components/layout/FloatingDock";
import { WebSiteTemplate } from "./templates/WebSiteTemplate";
const BrandTab = lazy(() => import("./components/studio/BrandTab"));
const ContentTab = lazy(() => import("./components/studio/ContentTab"));
const ExportTab = lazy(() => import("./components/studio/ExportTab"));
const TemplateTab = lazy(() => import("./components/studio/TemplateTab"));
import type { T1CardStyle, T1NavStyle, T1ButtonStyle } from "./templates/Template1Screen";
import Template1Screen from "./templates/Template1Screen";
import { useLanguage } from "@/context/LanguageContext";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type PageType = "home" | "menu" | "cart" | "profile";
type DeviceType = "mobile" | "tablet" | "desktop";
type ViewMode = "grid" | "list";
type TextureType = "none" | "noise" | "grid" | "dots";
type TemplateType = TmplType;
type StudioTab = "brand" | "content" | "template" | "export";
const PAGE_ORDER: PageType[] = ["home", "menu", "cart", "profile"];

const iconComponents: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-5 h-5" />,
  Coffee: <Coffee className="w-5 h-5" />,
  Scissors: <Scissors className="w-5 h-5" />,
  Pill: <Pill className="w-5 h-5" />,
  Store: <Store className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
};

const serviceTypes: ServiceType[] = serviceTypesConfig.map((config) => ({
  ...config,
  icon: iconComponents[config.iconName],
}));

// ============================================================================
// COMPONENT
// ============================================================================

const LivePreviewTool = () => {
  // Auth & Navigation
  const authClient = useClient();
  const isAuthenticated = useIsAuthenticated();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Core State
  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoEmoji, setLogoEmoji] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [brandPersonality, setBrandPersonality] = useState<"friendly" | "premium" | "bold">("friendly");
  const [rating, setRating] = useState(4.8);
  const [openTime, setOpenTime] = useState("9 AM");
  const [closeTime, setCloseTime] = useState("10 PM");
  const [bio, setBio] = useState("");
  const [serviceType, setServiceType] = useState("restaurant");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartItems, setCartItems] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "rating">("name");
  const [favorites, setFavorites] = useState<number[]>([]);

  // Studio Panel
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>("brand");

  // Theme & Style
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [customTheme, setCustomTheme] = useState({ primary: "#00bcd4", accent: "#00bcd4", gradient: "linear-gradient(135deg, #00bcd4, #00acc1)" });
  const [glassEffect, setGlassEffect] = useState(false);
  const [fontSize, setFontSize] = useState(1);
  const [activeTexture, setActiveTexture] = useState<TextureType>("none");

  // Layout
  const [deviceView, setDeviceView] = useState<DeviceType>("mobile");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("aether");
  const [selectedCategoryStyle, setSelectedCategoryStyle] = useState<CategoryStyle>("pill");
  const [selectedButtonStyle, setSelectedButtonStyle] = useState<ButtonStyle>("outline");
  const [selectedFeaturedStyle, setSelectedFeaturedStyle] = useState<FeaturedStyle>("banner");
  const [selectedNavStyle, setSelectedNavStyle] = useState<NavStyle>("default");
  const [selectedNavPlacement, setSelectedNavPlacement] = useState<NavPlacement>("bottom");
  const [selectedHeaderStyle, setSelectedHeaderStyle] = useState<HeaderStyle>("default");
  const [selectedCardStyle, setSelectedCardStyle] = useState<CardStyle>("elevated");
  const [selectedSearchStyle, setSelectedSearchStyle] = useState<SearchStyle>("minimal");
  const [selectedPriceStyle, setSelectedPriceStyle] = useState<PriceStyle>("plain");
  const [selectedStatsStyle, setSelectedStatsStyle] = useState<StatsStyle>("card");
  const [previewMode, setPreviewMode] = useState<"app" | "web">("app");
  const [enable3D, setEnable3D] = useState(true);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);

  // Preview State
  const [currentPage, setCurrentPage] = useState<PageType>("menu");
  const [showSearch, setShowSearch] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const [promoHovered, setPromoHovered] = useState(false);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const promoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Content
  const [customItems, setCustomItems] = useState<MenuItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", image: "", category: "" });

  // Edit & Undo/Redo
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemHistory, setItemHistory] = useState<MenuItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const setCustomItemsWithHistory = useCallback((updater: (prev: MenuItem[]) => MenuItem[]) => {
    setCustomItems(prev => {
      const next = updater(prev);
      setItemHistory(h => {
        const trimmed = h.slice(0, historyIndex + 1);
        return [...trimmed, next];
      });
      setHistoryIndex(i => i + 1);
      return next;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setCustomItems(itemHistory[newIndex]);
    setHistoryIndex(newIndex);
  }, [historyIndex, itemHistory]);

  const redo = useCallback(() => {
    if (historyIndex >= itemHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    setCustomItems(itemHistory[newIndex]);
    setHistoryIndex(newIndex);
  }, [historyIndex, itemHistory]);

  // Advanced
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRatings, setShowRatings] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showFeatured, setShowFeatured] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [imageQuality, setImageQuality] = useState<"standard" | "hd">("standard");
  const [copied, setCopied] = useState(false);

  // Save & Publish (silent auto-save)
  const [isSaving, setIsSaving] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Template style controls
  const [t1CardStyle, setT1CardStyle] = useState<T1CardStyle>("elevated");
  const [t1NavStyle, setT1NavStyle] = useState<T1NavStyle>("default");
  const [t1ButtonStyle, setT1ButtonStyle] = useState<T1ButtonStyle>("rounded");
  const [showStudioInfoModal, setShowStudioInfoModal] = useState(false);

  const studioLocked = true;

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isPreviewVisible = businessName.trim().length > 0;
  const tmpl = useMemo(() => TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0], [selectedTemplate]);
  const isNeonTemplate = !!tmpl.forceDark;
  const currentServiceType = useMemo(() => serviceTypes.find(st => st.id === serviceType) || serviceTypes[0], [serviceType]);
  const categories = currentServiceType.categories;
  const menuItems = useMemo(() => defaultItemsByServiceType[serviceType] || [], [serviceType]);

  const themes: Theme[] = useMemo(() => [
    ...baseThemes,
    { id: "custom", name: "Custom", primary: customTheme.primary, gradient: customTheme.gradient, accent: customTheme.accent, custom: true },
  ], [customTheme]);

  const currentTheme = useMemo(() => themes.find(t => t.id === selectedTheme) || themes[0], [themes, selectedTheme]);
  const allMenuItems = useMemo(() => [...menuItems, ...customItems], [menuItems, customItems]);
  const cartCount = useMemo(() => Object.values(cartItems).reduce((s, c) => s + c, 0), [cartItems]);
  const cartTotal = useMemo(() => Object.entries(cartItems).reduce((s, [id, qty]) => {
    const item = allMenuItems.find(i => i.id === Number(id));
    return s + (item ? parseFloat(item.price) * qty : 0);
  }, 0), [cartItems, allMenuItems]);

  const filteredItems = useMemo(() => {
    let items = selectedCategory === "all" ? allMenuItems : allMenuItems.filter(item => item.category === selectedCategory);
    if (featuredOnly) items = items.filter(item => item.featured);
    items = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return items.sort((a, b) => {
      if (sortBy === "price") return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return a.name.localeCompare(b.name);
    });
  }, [allMenuItems, selectedCategory, searchQuery, sortBy, featuredOnly]);

  const stats = useMemo(() => ({
    totalItems: allMenuItems.length,
    totalValue: allMenuItems.reduce((sum, item) => sum + parseFloat(item.price || "0"), 0),
    averagePrice: allMenuItems.length > 0 ? allMenuItems.reduce((sum, item) => sum + parseFloat(item.price || "0"), 0) / allMenuItems.length : 0,
    featuredCount: allMenuItems.filter(item => item.featured).length,
    categoriesCount: new Set(allMenuItems.map(item => item.category)).size,
  }), [allMenuItems]);

  const displayName = businessName.trim() || currentServiceType.name;
  const localizedOpenTime = openTime === "9 AM" ? t("9 ص", "9 AM") : openTime;
  const localizedCloseTime = closeTime === "10 PM" ? t("10 م", "10 PM") : closeTime;

  // Effective accent: use theme accent unless it's default, then use template accent
  const effectiveAccent = selectedTheme !== "default" ? currentTheme.accent : tmpl.accent;
  const effectiveGradient = selectedTheme !== "default" ? currentTheme.gradient : `linear-gradient(135deg, ${tmpl.accent}, ${tmpl.accent}dd)`;
  const activeCategoryStyle = selectedCategoryStyle;
  const activeButtonStyle = selectedButtonStyle;
  const activeFeaturedStyle = selectedFeaturedStyle;
  const activeNavStyle = selectedNavStyle;
  const activeNavPlacement = selectedNavPlacement;
  const activeHeaderStyle = selectedHeaderStyle;
  const activeCardStyle = selectedCardStyle;
  const activeSearchStyle = selectedSearchStyle;
  const activePriceStyle = selectedPriceStyle;
  const activeStatsStyle = selectedStatsStyle;

  // Text helpers for themed headers
  const headerTextWhite = selectedTheme !== "default" || !!tmpl.forceDark || tmpl.headerBg.includes("gradient");

  useEffect(() => {
    setSelectedCategoryStyle(tmpl.catStyle);
    setSelectedButtonStyle(tmpl.btnStyle);
    setSelectedFeaturedStyle(tmpl.featuredStyle);
    setSelectedNavStyle(tmpl.navStyle);
    setSelectedNavPlacement(tmpl.navPlacement);
    setSelectedHeaderStyle(tmpl.headerStyle);
    setSelectedCardStyle(tmpl.cardStyle);
    setSelectedSearchStyle(tmpl.searchStyle);
    setSelectedPriceStyle(tmpl.priceStyle);
    setSelectedStatsStyle(tmpl.statsStyle);
  }, [tmpl]);

  // Promo auto-cycle — pauses on hover
  useEffect(() => {
    if (promoHovered) {
      if (promoIntervalRef.current) clearInterval(promoIntervalRef.current);
      return;
    }
    promoIntervalRef.current = setInterval(() => setPromoIndex(p => (p + 1) % 3), 4000);
    return () => { if (promoIntervalRef.current) clearInterval(promoIntervalRef.current); };
  }, [promoHovered]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  useEffect(() => {
    setSelectedCategory("all");
    setNewItem(prev => ({ ...prev, category: currentServiceType.categories[1]?.id || "" }));
  }, [serviceType, currentServiceType]);

  const updateCustomTheme = (colorType: "primary" | "accent", color: string) => {
    const n = { ...customTheme, [colorType]: color };
    setCustomTheme({ ...n, gradient: `linear-gradient(135deg, ${n.primary}, ${n.accent})` });
  };

  const addToCart = (itemId: number) => {
    setCartItems(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: number) => {
    setCartItems(prev => {
      const n = { ...prev };
      if (n[itemId] > 1) n[itemId]--;
      else delete n[itemId];
      return n;
    });
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price || !newItem.category) {
      toast.error("Please fill all required fields");
      return;
    }
    const item: MenuItem = {
      id: Date.now(), name: newItem.name, description: newItem.description,
      price: newItem.price, image: newItem.image || "/placeholder.svg",
      category: newItem.category, rating: 4.5,
    };
    setCustomItems(prev => [...prev, item]);
    setNewItem({ name: "", description: "", price: "", image: "", category: currentServiceType.categories[1]?.id || "" });
    setShowAddItem(false);
    toast.success("Item added successfully!");
  };

  const handleModalSave = useCallback((item: MenuItem) => {
    if (editingItem) {
      setCustomItemsWithHistory(prev =>
        prev.map(i => i.id === item.id ? item : i)
      );
      toast.success(`"${item.name}" updated!`);
    } else {
      setCustomItemsWithHistory(prev => [...prev, item]);
      toast.success(`"${item.name}" added!`);
    }
    setEditingItem(null);
  }, [editingItem, setCustomItemsWithHistory]);

  const handleDeleteItem = useCallback((id: number, name: string) => {
    setCustomItemsWithHistory(prev => prev.filter(i => i.id !== id));
    toast.success(`"${name}" removed`);
  }, [setCustomItemsWithHistory]);

  // Navigate pages with direction tracking for slide animations
  const navigatePage = useCallback((page: PageType) => {
    const from = PAGE_ORDER.indexOf(currentPage);
    const to = PAGE_ORDER.indexOf(page);
    setPageDirection(to >= from ? 1 : -1);
    setCurrentPage(page);
  }, [currentPage]);

  const handleReorderItem = useCallback((id: number, direction: "up" | "down") => {
    setCustomItemsWithHistory(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx < 0) return prev;
      const newArr = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newArr.length) return prev;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
  }, [setCustomItemsWithHistory]);

  const handleClearAllCustomItems = useCallback(() => {
    setCustomItemsWithHistory(() => []);
    toast.success("All custom items cleared");
  }, [setCustomItemsWithHistory]);

  const handleResetAll = useCallback(() => {
    setBusinessName("");
    setTagline("");
    setLogoEmoji("");
    setIsOpen(true);
    setBrandPersonality("friendly");
    setRating(4.8);
    setOpenTime("9 AM");
    setCloseTime("10 PM");
    setBio("");
    setServiceType("restaurant");
    setSelectedTheme("default");
    setSelectedTemplate("aether");
    setSelectedCategoryStyle("pill");
    setSelectedButtonStyle("outline");
    setSelectedFeaturedStyle("banner");
    setSelectedNavStyle("default");
    setSelectedNavPlacement("bottom");
    setSelectedHeaderStyle("default");
    setSelectedCardStyle("elevated");
    setSelectedSearchStyle("minimal");
    setSelectedPriceStyle("plain");
    setSelectedStatsStyle("card");
    setCustomItems([]);
    setCartItems({});
    setFavorites([]);
    setIsDarkMode(false);
    setGlassEffect(false);
    setActiveTexture("none");
    setFontSize(1);
    setViewMode("list");
    setEnable3D(true);
    setRotationX(0);
    setRotationY(0);
    setShowPrices(true);
    setFeaturedOnly(false);
    toast.success("Reset to defaults");
  }, []);

  const handleApplyAiPreset = useCallback(() => {
    setBusinessName("Luminary Cafe");
    setServiceType("cafe");
    setSelectedTheme("elegant");
    setGlassEffect(true);
    setSelectedTemplate("brutal");
    setSelectedCategoryStyle("chip");
    setSelectedButtonStyle("gradient");
    setSelectedFeaturedStyle("card");
    setSelectedNavStyle("pill");
    setSelectedNavPlacement("floating");
    setSelectedHeaderStyle("glass");
    setSelectedCardStyle("neo");
    setSelectedSearchStyle("glass");
    setSelectedPriceStyle("chip");
    setSelectedStatsStyle("glass");
    toast.success("AI template applied!");
  }, []);

  const handleApplyPerformanceMode = useCallback(() => {
    setGlassEffect(false);
    setActiveTexture("none");
    toast.info("Performance mode: heavy effects disabled");
  }, []);

  const exportData = () => {
    const data = { businessName, serviceType, theme: selectedTheme, template: selectedTemplate, items: allMenuItems, createdAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${businessName || "preview"}-data.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported!");
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.serviceType) setServiceType(data.serviceType);
        if (data.theme) setSelectedTheme(data.theme);
        if (data.template) setSelectedTemplate(data.template);
        if (data.items) setCustomItems(data.items.filter((item: MenuItem) => !menuItems.find(mi => mi.id === item.id)));
        toast.success("Data imported!");
      } catch { toast.error("Error reading file"); }
    };
    reader.readAsText(file);
  };

  const copyShareLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#live-preview`;
    const success = await copyToClipboard(link, "Link copied!", "Failed to copy");
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Description", "Price", "Category", "Featured", "Time", "Rating"];
    const rows = allMenuItems.map(item => [item.name, item.description, item.price, item.category, item.featured ? "Yes" : "No", item.time || "", item.rating?.toString() || ""]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${businessName || "menu"}-items.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  // ============================================================================
  // SILENT AUTO-SAVE SYSTEM
  // ============================================================================

  const getPreviewUrl = useCallback((designId: string) => {
    return `${window.location.origin}/demo?id=${designId}`;
  }, []);

  /** Build the save payload from current state */
  const buildPayload = useCallback((): SaveDesignPayload => ({
    business_name: businessName.trim(),
    service_type: serviceType,
    selected_theme: selectedTheme,
    custom_theme: customTheme,
    selected_template: selectedTemplate,
    is_dark_mode: isDarkMode,
    glass_effect: glassEffect,
    active_texture: activeTexture,
    font_size: fontSize,
    view_mode: viewMode,
    device_view: deviceView,
    enable_3d: enable3D,
    rotation_x: rotationX,
    rotation_y: rotationY,
    show_ratings: showRatings,
    show_time: showTime,
    show_featured: showFeatured,
    image_quality: imageQuality,
    sort_by: sortBy,
    custom_items: customItems,
    cart_items: cartItems,
    favorites,
    client_id: authClient?.id || undefined,
    browser_data: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timestamp: new Date().toISOString(),
    },
  }), [businessName, serviceType, selectedTheme, customTheme, selectedTemplate, isDarkMode, glassEffect, activeTexture, fontSize, viewMode, deviceView, enable3D, rotationX, rotationY, showRatings, showTime, showFeatured, imageQuality, sortBy, customItems, cartItems, favorites, authClient]);

  /** Silent save — no modal, no user interaction needed */
  const performSilentSave = useCallback(async () => {
    if (!businessName.trim() || !isAuthenticated || !authClient?.id) return;

    setIsSaving(true);
    try {
      const payload = buildPayload();

      if (savedDesignId) {
        // Update existing design
        await updateDesign(savedDesignId, payload);
      } else {
        // Create new design
        const saved = await saveDesign(payload);
        setSavedDesignId(saved.id);
      }

      setLastSavedAt(new Date());
    } catch (err: unknown) {
      console.error("Auto-save error:", err);
      // Silent fail — don't bother user
    } finally {
      setIsSaving(false);
    }
  }, [businessName, isAuthenticated, authClient, savedDesignId, buildPayload]);

  // Keep a stable ref to the latest performSilentSave so the timer callback
  // doesn't introduce it as a dependency of scheduleAutoSave.
  const performSilentSaveRef = useRef(performSilentSave);
  useEffect(() => { performSilentSaveRef.current = performSilentSave; });

  /** Debounced auto-save — triggers 2s after last change */
  const scheduleAutoSave = useCallback(() => {
    if (!isAuthenticated || !businessName.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performSilentSaveRef.current();
    }, 2000);
  }, [isAuthenticated, businessName]);

  // Watch all design state changes for auto-save
  useEffect(() => {
    scheduleAutoSave();
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [businessName, serviceType, selectedTheme, customTheme, selectedTemplate, isDarkMode, glassEffect, activeTexture, fontSize, viewMode, deviceView, enable3D, rotationX, rotationY, showRatings, showTime, showFeatured, imageQuality, sortBy, customItems, cartItems, favorites, scheduleAutoSave]);

  /** Manual save button — if not logged in, prompt login */
  const handleManualSave = useCallback(() => {
    if (!businessName.trim()) {
      toast.error("Please enter a business name first");
      return;
    }
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    performSilentSave();
    toast.success("Design saved!");
  }, [businessName, isAuthenticated, performSilentSave]);

  /** Redirect to login with return URL */
  const handleLoginRedirect = useCallback(() => {
    setShowLoginPrompt(false);
    navigate('/client-login?redirect=' + encodeURIComponent('/#live-preview'));
  }, [navigate]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "e") { e.preventDefault(); exportToCSV(); }
        if (e.key === "i") { e.preventDefault(); setShowAddItem(true); }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studioTabs: { id: StudioTab; label: string; icon: typeof Layers }[] = [
    { id: "brand", label: "Brand", icon: Briefcase },
    { id: "content", label: "Content", icon: Layers },
    { id: "template", label: "Template", icon: Palette },
    { id: "export", label: "Export", icon: FileDown },
  ];

  // ============================================================================
  // TEMPLATE-AWARE RENDER HELPERS
  // ============================================================================

  const getImgSrc = (src: string) => imageQuality === "hd" ? src.replace("?w=400", "?w=800&q=90") : src;

  const cardStyleClass = useMemo(() => {
    switch (activeCardStyle) {
      case "flat": return "shadow-none border";
      case "outline": return "border-2 shadow-none";
      case "neo": return "border shadow-[8px_8px_0_rgba(15,23,42,0.2)]";
      case "inset": return "border shadow-inner";
      case "brutal": return "border-2 rounded-none shadow-[6px_6px_0_rgba(249,115,22,0.35)]";
      default: return "shadow-md border";
    }
  }, [activeCardStyle]);

  const headerStyleClass = useMemo(() => {
    switch (activeHeaderStyle) {
      case "glass": return "backdrop-blur-xl border-b border-white/15";
      case "split": return "border-b-2";
      case "centered": return "justify-center text-center";
      case "compact": return "py-2";
      case "banner": return "shadow-lg";
      default: return "";
    }
  }, [activeHeaderStyle]);

  const headerStyleOverride = useMemo<React.CSSProperties>(() => {
    if (activeHeaderStyle === "split") return { borderColor: `${effectiveAccent}55` };
    if (activeHeaderStyle === "banner") return { boxShadow: `0 8px 24px ${effectiveAccent}30` };
    return {};
  }, [activeHeaderStyle, effectiveAccent]);

  const headerBaseStyle: React.CSSProperties = selectedTheme !== "default" && !glassEffect
    ? { background: currentTheme.gradient }
    : (!glassEffect && headerTextWhite ? { background: effectiveGradient } : {});

  const searchWrapClass = useMemo(() => {
    switch (activeSearchStyle) {
      case "soft": return "rounded-2xl border";
      case "pill": return "rounded-full border";
      case "glass": return "rounded-2xl border backdrop-blur-md bg-white/10";
      case "underline": return "border-b";
      case "terminal": return "rounded-none border-2";
      default: return "rounded-lg border";
    }
  }, [activeSearchStyle]);

  const searchInputClass = useMemo(() => {
    if (activeSearchStyle === "terminal") return "font-mono tracking-wide";
    if (activeSearchStyle === "underline") return "rounded-none bg-transparent border-0 border-b";
    return "";
  }, [activeSearchStyle]);

  const priceClass = useMemo(() => {
    switch (activePriceStyle) {
      case "pill": return "px-2 py-0.5 rounded-full bg-black/10";
      case "tag": return "px-1.5 py-0.5 rounded-md border text-[10px] uppercase tracking-wide";
      case "chip": return "px-2 py-0.5 rounded-lg bg-white/70";
      case "glow": return "px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(34,211,238,0.25)]";
      default: return "";
    }
  }, [activePriceStyle]);

  const statsCardClass = useMemo(() => {
    switch (activeStatsStyle) {
      case "strip": return "rounded-none border-x-0";
      case "minimal": return "shadow-none border-0 bg-transparent";
      case "glass": return "backdrop-blur-md bg-white/10 border border-white/20";
      case "tiles": return "rounded-none border-2";
      default: return "";
    }
  }, [activeStatsStyle]);

  // -- Category pills per template --
  const renderCategory = (cat: { id: string; name: string; icon: string }, isActive: boolean) => {
    const base = "flex items-center gap-1.5 whitespace-nowrap transition-all text-xs font-medium";
    switch (activeCategoryStyle) {
      case "underline":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-2 py-2 border-b-2 ${isActive ? "border-current font-bold" : "border-transparent"}`} style={isActive ? { color: effectiveAccent } : { color: isNeonTemplate ? "#94a3b8" : "#64748b" }}><span>{cat.name}</span></button>;
      case "chip":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-4 py-2 rounded-xl ${isActive ? "text-white shadow-lg" : "bg-white text-muted-foreground border border-slate-200"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "block":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-3 py-2 rounded-lg ${isActive ? "text-white font-bold" : "bg-amber-50 text-amber-800 border border-amber-200/50"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span className="tracking-wide uppercase text-[10px] font-bold">{cat.name}</span></button>;
      case "glow":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-3 py-2 rounded-lg border ${isActive ? "border-cyan-400/50 text-cyan-300" : "border-slate-700 text-slate-400"}`} style={isActive ? { boxShadow: `0 0 12px ${effectiveAccent}40`, background: `${effectiveAccent}15` } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "tag":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-4 py-2 rounded-full border-2 font-bold ${isActive ? "text-white border-transparent" : "text-orange-600 border-orange-200 bg-white"}`} style={isActive ? { background: effectiveGradient, borderColor: "transparent" } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "minimal":
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-3 py-2 rounded-full ${isActive ? "font-bold text-white" : "text-green-700 bg-green-50"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      default: // pill
        return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} px-3 py-1.5 rounded-full ${isActive ? "text-white shadow-md" : "bg-white text-muted-foreground border border-slate-200 hover:bg-background"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
    }
  };

  // -- Add to cart button per template --
  const renderAddBtn = (itemId: number, small = false) => {
    const qty = cartItems[itemId] || 0;
    if (qty > 0) {
      return (
        <div className={`flex items-center gap-1 ${small ? "justify-center" : "justify-between"}`}>
          <button onClick={() => removeFromCart(itemId)} className={`w-7 h-7 flex items-center justify-center ${tmpl.btnRadius} border transition-all`} style={{ borderColor: effectiveAccent + "50", color: effectiveAccent }}><Minus className="w-3 h-3" /></button>
          <span className={`text-xs font-bold min-w-[20px] text-center ${isNeonTemplate ? "text-cyan-300" : "text-slate-700"}`}>{qty}</span>
          <button onClick={() => addToCart(itemId)} className={`w-7 h-7 flex items-center justify-center ${tmpl.btnRadius} text-white transition-all`} style={{ background: effectiveAccent }}><Plus className="w-3 h-3" /></button>
        </div>
      );
    }

    const sizeClass = small ? "py-1.5 text-[10px]" : "py-2 text-xs";
    switch (activeButtonStyle) {
      case "gradient":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 text-white`} style={{ background: effectiveGradient }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "ghost":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-medium flex items-center justify-center gap-1.5 hover:bg-muted transition-colors`} style={{ color: effectiveAccent }}><Plus className="w-3 h-3" />{small ? "Add" : "Add"}</button>;
      case "glow":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 border text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 transition-all`} style={{ boxShadow: `0 0 8px ${effectiveAccent}30` }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "filled":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 text-white`} style={{ background: effectiveAccent }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "soft":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 transition-all`} style={{ background: effectiveAccent + "15", color: effectiveAccent }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "bold":
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-black flex items-center justify-center gap-1.5 text-white shadow-lg uppercase tracking-wide`} style={{ background: effectiveGradient }}><Plus className="w-3 h-3" />{small ? "ADD" : "ADD TO CART"}</button>;
      default: // outline
        return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 border-2 transition-all`} style={{ borderColor: effectiveAccent, color: effectiveAccent, background: effectiveAccent + "08" }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
    }
  };

  // -- Featured banner per template --
  const renderFeaturedBanner = () => {
    if (!showFeatured || selectedCategory !== "all") return null;
    const featuredCount = stats.featuredCount;
    if (featuredCount === 0) return null;
    switch (activeFeaturedStyle) {
      case "card":
        return <div className="rounded-2xl p-4 text-white" style={{ background: effectiveGradient }}><div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4" /><span className="text-sm font-bold">Featured Collection</span></div><p className="text-xs opacity-80">{featuredCount} specially curated items</p></div>;
      case "strip":
        return <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: effectiveAccent + "30", color: effectiveAccent }}><Sparkles className="w-3 h-3" /><span className="text-xs font-medium tracking-wide uppercase">Featured items available</span></div>;
      case "glow":
        return <div className="rounded-xl p-3 border text-center" style={{ borderColor: effectiveAccent + "30", background: effectiveAccent + "08", boxShadow: `0 0 20px ${effectiveAccent}15` }}><span className="text-xs font-bold" style={{ color: effectiveAccent }}>⚡ {featuredCount} Featured Items</span></div>;
      case "overlay":
        return <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: effectiveGradient }}><div className="absolute inset-0 bg-black/20" /><div className="relative z-10"><div className="flex items-center gap-2 mb-0.5"><Award className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Premium Selection</span></div><p className="text-[10px] opacity-80">{featuredCount} exclusive featured items</p></div></div>;
      case "badge":
        return <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: effectiveAccent + "10" }}><Leaf className="w-4 h-4" style={{ color: effectiveAccent }} /><span className="text-xs font-bold" style={{ color: effectiveAccent }}>Chef's Picks — {featuredCount} items</span></div>;
      case "wave":
        return <div className="rounded-3xl p-4 text-white font-black" style={{ background: effectiveGradient }}><div className="flex items-center justify-between"><div><span className="text-xl">🔥</span><span className="text-sm ml-2 uppercase tracking-wider">HOT PICKS</span></div><span className="text-2xl">{featuredCount}</span></div></div>;
      default: // banner
        return <div className="rounded-xl p-3 flex items-center justify-between" style={selectedTheme !== "default" ? { background: currentTheme.gradient } : { background: effectiveAccent + "12", border: `1px solid ${effectiveAccent}20` }}><div className={selectedTheme !== "default" ? "text-white" : ""} style={selectedTheme === "default" ? { color: effectiveAccent } : {}}><div className="flex items-center gap-1.5 mb-0.5"><Flame className="w-3 h-3" /><span className="text-[10px] font-semibold uppercase tracking-wider">Featured Items</span></div><p className="text-xs opacity-80">Special discounts on featured items</p></div><div className="text-2xl">🔥</div></div>;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <section id="live-preview" className="relative overflow-hidden">
      <div className="bg-gradient-to-b from-background via-[#0a1118] to-background relative">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.08] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00bcd4]/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-400/[0.06] rounded-full blur-[150px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,188,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,188,212,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="container mx-auto relative z-10 max-w-[1440px] px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          {/* ============ STUDIO HEADER ============ */}
          <div className="text-center mb-8 sm:mb-12">
            <motion.div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/20" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,188,212,0.5)]" />
              <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">{t("استوديو التصميم المباشر", "Live Design Studio")}</span>
              {studioLocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400/15 to-orange-400/10 px-2.5 py-1 text-[10px] font-black text-amber-200 tracking-[0.18em] uppercase shadow-[0_0_20px_rgba(251,191,36,0.12)]">
                  <Lock className="w-3 h-3" />
                  {t("قريبًا", "Coming Soon")}
                </span>
              )}
            </motion.div>
            <motion.h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t("صمّم تطبيقك", "Design Your App")}{" "}<span className="bg-gradient-to-r from-primary via-[#64ffda] to-[#00bcd4] bg-clip-text text-transparent">{t("في الوقت الحقيقي", "In Real-Time")}</span>
            </motion.h2>
            <motion.p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {t("اختر نوع نشاطك، حدّد القالب، خصّص كل تفصيلة، وشاهد تطبيقك ينبض بالحياة.", "Choose your business type, pick a template, customize every detail, and see your app come to life")}
            </motion.p>
            {studioLocked && (
              <motion.button
                type="button"
                onClick={() => setShowStudioInfoModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 to-emerald-400/10 px-4 py-2 text-xs font-bold text-cyan-200 hover:from-cyan-500/20 hover:to-emerald-400/20 transition-all"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Info className="w-3.5 h-3.5" />
                {t("استعرض تجربة قريبًا", "Preview The Coming Soon Experience")}
              </motion.button>
            )}
            {studioLocked && (
              <motion.div
                className="mt-4 mx-auto max-w-3xl overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(251,191,36,0.14)_0%,rgba(34,211,238,0.10)_50%,rgba(16,185,129,0.10)_100%)] px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-left">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.35em] text-amber-200/90">
                      {t("تحميل محرك الإبداع", "Creative Engine Loading")}
                    </p>
                    <p className="mt-2 text-sm sm:text-base font-semibold text-white">
                      {t("يتم الآن تجهيز استوديو التصميم المباشر خلف الكواليس وسيُفتح قريبًا.", "Live Design Studio is being crafted behind the scenes and will unlock soon.")}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-cyan-100/80">
                      {t("التنسيق اللحظي، والتبديل الفوري للتخطيطات، وتحرير فكرة التطبيق التفاعلي في الطريق.", "Real-time styling, instant layout switching, and interactive app concept editing are on the way.")}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:min-w-[260px]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">{t("الثيمات", "Themes")}</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">{t("التخطيطات", "Layouts")}</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">{t("الحركة", "Motion")}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ============ MAIN STUDIO LAYOUT ============ */}
          <div className="relative flex flex-col xl:flex-row gap-6 lg:gap-8">

            {/* ========== LEFT: DESIGN STUDIO PANEL ========== */}
            <motion.div className={`hidden xl:block xl:w-[380px] flex-shrink-0 order-2 xl:order-1 ${studioLocked ? "pointer-events-none select-none opacity-70" : ""}`} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="xl:sticky xl:top-24 space-y-4">
                <div className="relative glass-card rounded-2xl overflow-hidden shadow-xl shadow-primary/[0.05]">
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-primary/15 via-cyan-200/10 to-transparent pointer-events-none z-0" />
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/[0.06] rounded-full blur-[80px]" />
                    <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-400/[0.04] rounded-full blur-[80px]" />
                  </div>

                  {/* Studio Header */}
                  <div className="p-4 pb-2 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-cyan-400/10 border border-primary/15 flex items-center justify-center"><Layers size={16} className="text-primary" /></div>
                        <div><h2 className="text-sm font-bold text-foreground">Design Studio</h2><p className="text-[10px] text-muted-foreground">Customize everything</p></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={handleResetAll} className="w-7 h-7 rounded-lg bg-black/40 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all" title="Reset All" aria-label="Reset all studio settings"><RotateCcw size={12} /></button>
                        <button className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center text-purple-400 hover:border-purple-500/40 transition-all hover:scale-105 active:scale-95" title="AI Generate" aria-label="Apply AI style preset" onClick={handleApplyAiPreset}><Wand2 size={12} /></button>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="px-4 mb-2 relative z-10">
                    <div className="flex bg-muted/80 border border-slate-200/60 p-0.5 rounded-xl overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {studioTabs.map((tab) => {
                        const Icon = tab.icon; const isActive = activeStudioTab === tab.id; return (
                          <button key={tab.id} onClick={() => setActiveStudioTab(tab.id)} className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${isActive ? 'bg-primary text-white shadow-[0_0_12px_rgba(0,188,212,0.25)]' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}><Icon size={12} /><span className="hidden sm:inline">{tab.label}</span></button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="px-4 py-3 relative z-10 overflow-y-auto max-h-[520px]" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,188,212,0.15) transparent' }}>
                    <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
                    <AnimatePresence mode="wait">
                      {/* ===== BRAND TAB ===== */}
                      {activeStudioTab === "brand" && (
                        <BrandTab
                          businessName={businessName}
                          setBusinessName={setBusinessName}
                          tagline={tagline}
                          setTagline={setTagline}
                          logoEmoji={logoEmoji}
                          setLogoEmoji={setLogoEmoji}
                          isOpen={isOpen}
                          setIsOpen={setIsOpen}
                          brandPersonality={brandPersonality}
                          setBrandPersonality={setBrandPersonality}
                          rating={rating}
                          setRating={setRating}
                          openTime={openTime}
                          setOpenTime={setOpenTime}
                          closeTime={closeTime}
                          setCloseTime={setCloseTime}
                          bio={bio}
                          setBio={setBio}
                          serviceType={serviceType}
                          setServiceType={setServiceType}
                          serviceTypesConfig={serviceTypesConfig}
                          iconComponents={iconComponents}
                        />
                      )}

                      {/* ===== CONTENT TAB ===== */}
                      {activeStudioTab === "content" && (
                        <ContentTab
                          showRatings={showRatings}
                          setShowRatings={setShowRatings}
                          showTime={showTime}
                          setShowTime={setShowTime}
                          showFeatured={showFeatured}
                          setShowFeatured={setShowFeatured}
                          showPrices={showPrices}
                          setShowPrices={setShowPrices}
                          featuredOnly={featuredOnly}
                          setFeaturedOnly={setFeaturedOnly}
                          imageQuality={imageQuality}
                          setImageQuality={setImageQuality}
                          sortBy={sortBy}
                          setSortBy={setSortBy}
                          customItems={customItems}
                          allMenuItems={allMenuItems}
                          effectiveAccent={effectiveAccent}
                          historyIndex={historyIndex}
                          itemHistoryLength={itemHistory.length}
                          onUndo={undo}
                          onRedo={redo}
                          onAddItem={() => { setEditingItem(null); setShowAddItem(true); }}
                          onEditItem={(item) => { setEditingItem(item); setShowAddItem(true); }}
                          onDeleteItem={handleDeleteItem}
                          onReorderItem={handleReorderItem}
                          onClearAllItems={handleClearAllCustomItems}
                        />
                      )}

                      {/* ===== TEMPLATE TAB ===== */}
                      {activeStudioTab === "template" && (
                        <TemplateTab
                          cardStyle={t1CardStyle}
                          setCardStyle={setT1CardStyle}
                          navStyle={t1NavStyle}
                          setNavStyle={setT1NavStyle}
                          buttonStyle={t1ButtonStyle}
                          setButtonStyle={setT1ButtonStyle}
                          accent={effectiveAccent}
                        />
                      )}

                      {/* ===== EXPORT TAB ===== */}
                      {activeStudioTab === "export" && (
                        <ExportTab
                          onExportJson={exportData}
                          onExportCsv={exportToCSV}
                          onImport={importData}
                          onCopyLink={copyShareLink}
                          onShowQR={() => setShowQRModal(true)}
                          copied={copied}
                        />
                      )}
                    </AnimatePresence>
                    </Suspense>
                  </div>

                  <div className="p-3 bg-background/60 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground px-4 relative z-10">
                    <SyncOrb isSaving={isSaving} lastSavedAt={lastSavedAt} isAuthenticated={isAuthenticated} effectiveAccent={effectiveAccent} />
                    {!isAuthenticated && <span className="flex items-center gap-1"><CloudOff size={10} />Login to save</span>}
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: effectiveAccent, boxShadow: `0 0 6px ${effectiveAccent}80` }} />
                      <span style={{ color: `${effectiveAccent}80` }}>Live</span>
                    </div>
                  </div>
                </div>

                {/* Stats Card */}
                {isPreviewVisible && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 backdrop-blur-xl rounded-2xl border border-primary/10 p-4 relative overflow-hidden shadow-lg shadow-primary/[0.03]">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-3 relative z-10"><div className="flex items-center gap-2"><BarChart3 size={14} className="text-primary" /><span className="text-xs font-bold text-muted-foreground">Analytics</span></div><button onClick={() => setShowStats(!showStats)} className="text-slate-300 hover:text-slate-500">{showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>
                    <AnimatePresence>{showStats && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative z-10">
                        <div className="grid grid-cols-2 gap-2">{[{ label: "Total Items", value: stats.totalItems, color: "#00bcd4" }, { label: "Total Value", value: `${stats.totalValue.toFixed(0)} EGP`, color: "#a78bfa" }, { label: "Avg Price", value: `${stats.averagePrice.toFixed(0)} EGP`, color: "#f472b6" }, { label: "Featured", value: stats.featuredCount, color: "#fbbf24" }].map((stat) => (<motion.div key={stat.label} className="bg-background/80 rounded-xl p-3 border border-slate-200/60" whileHover={{ scale: 1.02 }}><div className="text-[9px] text-slate-400 mb-1">{stat.label}</div><motion.div className="text-lg font-bold" style={{ color: stat.color }} key={String(stat.value)} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{stat.value}</motion.div></motion.div>))}</div>
                      </motion.div>
                    )}</AnimatePresence>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* ========== CENTER: DEVICE PREVIEW ========== */}
            <motion.div className="flex-1 flex flex-col items-center justify-start order-1 xl:order-2" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="relative">
                {/* perspective must be on PARENT, not on the rotating child */}
                <div style={{ perspective: enable3D ? "1200px" : "none" }}>
                  <motion.div className="relative transition-all duration-500" style={{ width: deviceView === "mobile" ? 300 : deviceView === "tablet" ? 500 : 720, height: deviceView === "mobile" ? 640 : deviceView === "tablet" ? 700 : 480, maxWidth: "100%", transformStyle: "preserve-3d" }} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}
                    animate={enable3D ? { rotateY: isHovering ? 3 + rotationY : rotationY, rotateX: isHovering ? -2 + rotationX : rotationX, scale: isHovering ? 1.02 : 1 } : { rotateY: 0, rotateX: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  >

                    <motion.div className="absolute -inset-8 rounded-[3rem] blur-3xl pointer-events-none" style={{ backgroundColor: effectiveAccent + "15" }} animate={{ opacity: isHovering && enable3D ? 0.8 : 0.5, scale: isHovering ? 1.05 : 1 }} transition={{ duration: 0.3 }} />

                    {/* DEVICE FRAME — mobile: phone notch, tablet: iPad-style, desktop: browser chrome */}
                    <motion.div ref={phoneRef}
                      className={`relative mx-auto shadow-2xl transition-all duration-500 ${deviceView === "mobile" ? "rounded-[2rem] border-[3px] border-white/10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-2"
                        : deviceView === "tablet" ? "rounded-[1.5rem] border-[6px] border-slate-800 bg-slate-900 p-0"
                          : "rounded-xl border-[3px] border-slate-700 bg-slate-900 p-0"
                        } ${isPreviewVisible ? "opacity-100 scale-100" : "opacity-30 scale-95"}`}
                      style={{ width: deviceView === "mobile" ? 300 : deviceView === "tablet" ? 500 : 720, height: deviceView === "mobile" ? 640 : deviceView === "tablet" ? 700 : 480, fontSize: `${fontSize * 0.9}rem`, transformStyle: "preserve-3d" }}>

                      {/* Mobile: notch */}
                      {deviceView === "mobile" && <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-2xl z-20 flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700" /><div className="w-10 h-1 rounded-full bg-slate-700" /></div>}
                      {/* Tablet: home button indicator at bottom */}
                      {deviceView === "tablet" && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-slate-600 rounded-full z-20" />}
                      {/* Desktop: browser chrome bar */}
                      {deviceView === "desktop" && (
                        <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800 rounded-t-lg flex items-center px-3 gap-2 z-20 border-b border-slate-700">
                          <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/70" /></div>
                          <div className="flex-1 mx-2 bg-slate-700 rounded px-2 py-0.5 text-[9px] text-slate-400 truncate">{displayName || "your-app.com"}</div>
                        </div>
                      )}

                      {/* SCREEN */}
                      <div className={`relative overflow-hidden shadow-xl flex flex-col ${deviceView === "mobile" ? "rounded-[1.5rem]"
                        : deviceView === "tablet" ? "rounded-[1rem]"
                          : "rounded-b-lg rounded-t-none mt-8"
                        } ${isDarkMode ? tmpl.screenBgDark : tmpl.screenBg}`} style={{ height: deviceView === "desktop" ? "calc(100% - 2rem)" : "100%", fontSize: `${fontSize}rem` }}>
                        <Template1Screen
                          displayName={displayName}
                          isDarkMode={isDarkMode}
                          accent={effectiveAccent}
                          gradient={effectiveGradient}
                          tagline={tagline}
                          logoEmoji={logoEmoji}
                          rating={rating}
                          isOpen={isOpen}
                          openTime={openTime}
                          closeTime={closeTime}
                          showRatings={showRatings}
                          showPrices={showPrices}
                          showFeatured={showFeatured}
                          bio={bio}
                          cardStyle={t1CardStyle}
                          navStyle={t1NavStyle}
                          buttonStyle={t1ButtonStyle}
                        />
                        {/* Texture Overlay */}
                        {activeTexture !== 'none' && <div className="absolute inset-0 z-50 pointer-events-none opacity-20 mix-blend-overlay" style={{ backgroundImage: activeTexture === 'noise' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : activeTexture === 'grid' ? `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)` : `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: activeTexture === 'grid' ? '20px 20px' : activeTexture === 'dots' ? '10px 10px' : 'auto' }} />}

                        {/* WEB CATEGORY OVERLAY — covers entire screen when previewMode=web */}
                        {previewMode === "web" && (
                          <div className="absolute inset-0 z-[25] overflow-hidden flex flex-col">
                            <WebSiteTemplate
                              displayName={displayName}
                              serviceType={serviceType}
                              accent={effectiveAccent}
                              gradient={effectiveGradient}
                              isDarkMode={isDarkMode}
                              filteredItems={filteredItems}
                              categories={categories}
                              stats={stats}
                              showRatings={showRatings}
                              showFeatured={showFeatured}
                              showPrices={showPrices}
                              addToCart={(itemId) => addToCart(itemId)}
                              clearCart={() => setCartItems({})}
                              setSelectedImage={setSelectedImage}
                              isPreviewVisible={isPreviewVisible}
                              searchQuery={searchQuery}
                              setSearchQuery={setSearchQuery}
                              selectedCategory={selectedCategory}
                              setSelectedCategory={setSelectedCategory}
                              cartCount={cartCount}
                              favorites={favorites}
                              setFavorites={setFavorites}
                              rating={rating}
                              isOpen={isOpen}
                            />
                          </div>
                        )}

                        {/* Status Bar */}
                        <div className={`px-4 py-1 flex items-center justify-between text-[10px] flex-shrink-0 ${isNeonTemplate || isDarkMode ? "bg-black text-white" : "bg-slate-900 text-white"}`}><span className="font-medium">9:41</span><div className="flex items-center gap-1.5"><Signal size={10} /><Wifi size={10} /><Battery size={10} /></div></div>

                        {/* APP HEADER — template-aware */}
                        <div className={`px-4 ${activeHeaderStyle === "compact" ? "py-2" : "py-3"} flex items-center justify-between relative overflow-hidden flex-shrink-0 ${headerStyleClass} ${glassEffect ? "backdrop-blur-md bg-white/5 border-b border-white/10" : isDarkMode ? tmpl.headerBgDark : (selectedTheme !== "default" ? "" : tmpl.headerBg)}`} style={{ ...headerBaseStyle, ...headerStyleOverride }}>
                          <div className={`relative z-10 flex items-center gap-2 flex-1 min-w-0 ${activeHeaderStyle === "centered" ? "justify-center text-center" : ""}`}>
                            {logoEmoji && (
                              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-base bg-white/15 backdrop-blur-sm border border-white/10">
                                {logoEmoji}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {(tagline || tmpl.headerShowSubtitle) && <p className={`text-[9px] uppercase tracking-[0.2em] mb-0.5 ${headerTextWhite || glassEffect ? "text-white/60" : "text-slate-400"} ${brandPersonality === "premium" ? "italic" : ""}`}>{tagline ? (brandPersonality === "bold" ? tagline.toUpperCase() : tagline) : t("معاينة مباشرة", "Live Preview")}</p>}
                              <p className={`${tmpl.headerNameSize} font-bold ${headerTextWhite || glassEffect ? "text-white" : "text-foreground"} truncate`}>{displayName}</p>
                              {tmpl.headerShowRating && <div className="flex items-center gap-1.5 mt-0.5"><Star className={`w-2.5 h-2.5 fill-yellow-400 text-yellow-400`} /><span className={`text-[10px] ${headerTextWhite || glassEffect ? "text-white/80" : "text-muted-foreground"}`}>{rating.toFixed(1)}</span><span className={`text-[10px] font-medium ${isOpen ? "text-emerald-400" : headerTextWhite || glassEffect ? "text-white/50" : "text-slate-400"}`}>• {isOpen ? `${t("مفتوح", "Open")} · ${localizedOpenTime}–${localizedCloseTime}` : t("مغلق", "Closed")}</span></div>}
                            </div>
                          </div>
                          <div className="relative z-10 flex items-center gap-1.5">
                            {currentPage === "menu" && <button onClick={() => setShowSearch(!showSearch)} className={`p-1.5 rounded-lg ${showSearch ? "bg-white/20" : ""} transition-colors`}><Search className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white" : "text-slate-700"}`} /></button>}
                            {currentPage === "home" && notifications > 0 && <button onClick={() => setNotifications(0)} className="p-1.5 rounded-lg relative"><Bell className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white" : "text-slate-700"}`} /><span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">{notifications}</span></button>}
                            <div className="relative"><ShoppingCart className={`w-5 h-5 ${headerTextWhite || glassEffect ? "text-white" : "text-slate-700"}`} />{cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">{cartCount}</span>}</div>
                          </div>
                        </div>

                        {/* Search */}
                        {showSearch && currentPage === "menu" && (
                          <div className={`px-4 py-2 border-b ${isNeonTemplate ? "bg-slate-900 border-slate-800" : isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                            <div className={`relative ${searchWrapClass}`}><Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-400"}`} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className={`w-full pl-8 pr-8 py-1.5 text-xs focus:outline-none ${searchInputClass} ${isNeonTemplate || isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-background border-slate-200 text-foreground"}`} />{searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400" /></button>}</div>
                          </div>
                        )}



                        {/* ===== MAIN CONTENT ===== */}
                        <div className={`${activeNavPlacement === "side" ? "flex-1 min-h-0 flex" : "flex-1 min-h-0"}`}>
                          {isPreviewVisible && activeNavPlacement === "side" && (
                            <div className="h-full flex items-center">
                              <FloatingDock
                                previewMode
                                previewPage={currentPage}
                                onPreviewNavigate={navigatePage}
                                cartBadgeCount={cartCount}
                                previewAccentColor={effectiveAccent}
                                isDarkLikePreview={isNeonTemplate || isDarkMode}
                              />
                            </div>
                          )}
                          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', minHeight: 0 }}>
                            {isPreviewVisible ? (
                              <AnimatePresence mode="wait" custom={pageDirection}>
                                <motion.div key={currentPage} className="p-3 space-y-3"
                                  custom={pageDirection}
                                  initial={(dir: number) => ({ opacity: 0, x: dir * 40 })}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={(dir: number) => ({ opacity: 0, x: dir * -40 })}
                                  transition={{ duration: 0.22, ease: "easeInOut" }}>
                                  {/* =========== HOME PAGE =========== */}
                                  {currentPage === "home" && (
                                    <div className="space-y-3">
                                      {/* Promo Carousel — pauses on hover, dots are clickable */}
                                      <div
                                        className={`relative ${tmpl.cardRadius} overflow-hidden`}
                                        style={{ minHeight: 110 }}
                                        onMouseEnter={() => setPromoHovered(true)}
                                        onMouseLeave={() => setPromoHovered(false)}
                                      >
                                        <AnimatePresence mode="popLayout">
                                          <motion.div key={promoIndex} initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32, position: "absolute", top: 0, left: 0, right: 0 }} transition={{ duration: 0.28 }} className="p-4 text-white" style={{ minHeight: 110, background: promoIndex === 0 ? effectiveGradient : promoIndex === 1 ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                                            {promoIndex === 0 && <div><h3 className="text-lg font-bold mb-1">Welcome to {displayName}</h3><p className="text-xs opacity-90">Explore our amazing offerings</p></div>}
                                            {promoIndex === 1 && <div><div className="flex items-center gap-1 mb-1"><Flame className="w-4 h-4" /><span className="text-sm font-bold uppercase tracking-wide">Today's Special</span></div><p className="text-xs opacity-90">20% off on all featured items</p></div>}
                                            {promoIndex === 2 && <div><div className="flex items-center gap-1 mb-1"><ZapIcon className="w-4 h-4" /><span className="text-sm font-bold">New Arrivals</span></div><p className="text-xs opacity-90">Check out our latest additions</p></div>}
                                          </motion.div>
                                        </AnimatePresence>
                                        {/* Interactive dots */}
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">{[0, 1, 2].map(i => <button key={i} onClick={() => setPromoIndex(i)} aria-label={`Promo ${i + 1}`} className={`h-1.5 rounded-full transition-all bg-white ${promoIndex === i ? "w-4 opacity-100" : "w-1.5 opacity-40 hover:opacity-70"}`} />)}</div>
                                      </div>

                                      {/* Quick Stats */}
                                      <div className="grid grid-cols-3 gap-2">{[{ v: stats.totalItems, l: "Items", icon: "📦" }, { v: rating.toFixed(1), l: "Rating", icon: "⭐" }, { v: stats.featuredCount, l: "Featured", icon: "🔥" }].map(({ v, l, icon }) => (<div key={l} className={`${tmpl.cardRadius} ${statsCardClass} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-2 text-center`}><div className="text-sm mb-0.5">{icon}</div><div className="text-lg font-bold" style={{ color: effectiveAccent }}>{v}</div><div className={`text-[10px] ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{l}</div></div>))}</div>

                                      {/* Popular Items — only shown when featured items exist */}
                                      {filteredItems.some(i => i.featured) && (
                                        <div><h4 className={`text-sm font-bold mb-2 ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>Most Popular</h4><div className="space-y-2">{filteredItems.filter(i => i.featured).slice(0, 3).map((item) => (<div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${cardStyleClass} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-2 flex gap-2`}><div className={`w-12 h-12 ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0`}><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><h5 className={`text-xs font-bold ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{item.name}</h5><p className={`text-[10px] line-clamp-1 ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>{showPrices && <span className={`text-xs font-bold ${priceClass}`} style={{ color: effectiveAccent }}>{item.price} EGP</span>}</div></div>))}</div></div>
                                      )}

                                      <button onClick={() => setCurrentPage("menu")} className={`w-full py-2.5 ${tmpl.btnRadius} font-semibold text-xs flex items-center justify-center gap-1.5 text-white`} style={{ background: effectiveGradient }}>Browse All Menu <ArrowRight className="w-3 h-3" /></button>
                                    </div>
                                  )}

                                  {/* =========== MENU PAGE =========== */}
                                  {currentPage === "menu" && (
                                    <>
                                      {/* Categories — with right-side fade scroll hint */}
                                      <div className="relative -mx-3">
                                        <div className={`flex gap-1.5 overflow-x-auto pb-1.5 px-3 ${activeCategoryStyle === "underline" ? "border-b border-slate-200" : ""}`} style={{ scrollbarWidth: 'none' }}>
                                          {categories.map((cat) => renderCategory(cat, selectedCategory === cat.id))}
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-1.5 w-6 bg-gradient-to-l from-background/80 to-transparent pointer-events-none" />
                                      </div>

                                      {/* Featured Banner */}
                                      {renderFeaturedBanner()}

                                      {/* Items */}
                                      <AnimatePresence mode="wait">
                                        {viewMode === "list" ? (
                                          <motion.div key="list" className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                                            {filteredItems.map((item, index) => {
                                              // Elegant overlay card
                                              if (tmpl.cardOverlayText) return (
                                                <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${isDarkMode ? tmpl.cardBorderDark : tmpl.cardBorder} overflow-hidden relative group`} style={{ animationDelay: `${index * 0.05}s` }}>
                                                  <div className="relative h-32 cursor-pointer" onClick={() => setSelectedImage(item.image)}>
                                                    <img src={getImgSrc(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                                      <div className="flex items-start justify-between mb-0.5"><h3 className="font-bold text-sm">{item.name}</h3>{showPrices && <span className="font-bold text-sm" style={{ color: effectiveAccent }}>{item.price} EGP</span>}</div>
                                                      <p className="text-[10px] text-white/70 line-clamp-1 mb-1.5">{item.description}</p>
                                                      {(showRatings || showTime) && <div className="flex items-center gap-2 text-[10px] text-white/60">{item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />{item.rating}</div>}{item.time && showTime && <div className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{item.time}</div>}</div>}
                                                    </div>
                                                    {item.featured && showFeatured && <div className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold text-white rounded-full" style={{ background: effectiveGradient }}><Crown className="w-2.5 h-2.5 inline mr-0.5" />Premium</div>}
                                                    <button onClick={(e) => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute top-2 left-2 p-1.5 bg-white/20 backdrop-blur-sm rounded-full"><Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"}`} /></button>
                                                  </div>
                                                  <div className="p-2.5">{renderAddBtn(item.id)}</div>
                                                </div>
                                              );

                                              // Standard list card
                                              return (
                                                <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${cardStyleClass} overflow-hidden transition-all ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder}`} style={{ animationDelay: `${index * 0.05}s` }}>
                                                  <div className="flex gap-2 p-2">
                                                    <div className={`relative ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0 cursor-pointer group`} style={{ width: 72, height: 72 }} onClick={() => setSelectedImage(item.image)}>
                                                      <img src={getImgSrc(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"><ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                                      {item.featured && showFeatured && <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold flex items-center gap-0.5 z-10"><Star className="w-2 h-2 fill-white" /></div>}
                                                      <button onClick={(e) => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute bottom-0.5 left-0.5 p-1 bg-white/90 backdrop-blur-sm rounded-full z-10"><Heart className={`w-3 h-3 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} /></button>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-start justify-between gap-1.5 mb-0.5"><h3 className={`font-bold text-sm leading-tight ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{item.name}</h3>{showPrices && <span className={`font-bold whitespace-nowrap text-xs ${priceClass}`} style={{ color: effectiveAccent }}>{item.price} EGP</span>}</div>
                                                      <p className={`mb-1 line-clamp-2 text-xs ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                                                      {(showRatings || showTime) && <div className={`flex items-center gap-2 text-[10px] ${isNeonTemplate || isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />{item.rating}</div>}{item.time && showTime && <div className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{item.time}</div>}</div>}
                                                    </div>
                                                  </div>
                                                  <div className="px-2 pb-2">{renderAddBtn(item.id)}</div>
                                                </div>
                                              );
                                            })}
                                          </motion.div>
                                        ) : (
                                          <motion.div key="grid" className="grid grid-cols-2 gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                                            {filteredItems.map((item, index) => (
                                              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03, duration: 0.18 }} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${cardStyleClass} overflow-hidden transition-all ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder}`}>
                                                <div className={`relative aspect-square cursor-pointer group`} onClick={() => setSelectedImage(item.image)}>
                                                  <img src={getImgSrc(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                                                  {item.featured && showFeatured && <div className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded-full font-bold z-10 text-white" style={{ background: effectiveGradient }}><Star className="w-2 h-2 fill-white inline" /></div>}
                                                  <button onClick={(e) => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute bottom-1 left-1 p-1 bg-white/90 rounded-full z-10"><Heart className={`w-3 h-3 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} /></button>
                                                </div>
                                                <div className="p-2">
                                                  <h3 className={`font-bold text-xs leading-tight mb-0.5 line-clamp-1 ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{item.name}</h3>
                                                  <p className={`mb-1.5 line-clamp-1 text-[10px] ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                                                  <div className="flex items-center justify-between mb-1.5">{showPrices && <span className={`text-xs font-bold ${priceClass}`} style={{ color: effectiveAccent }}>{item.price} EGP</span>}{item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" /><span className="text-[10px]">{item.rating}</span></div>}</div>
                                                  {renderAddBtn(item.id, true)}
                                                </div>
                                              </motion.div>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                      {filteredItems.length === 0 && <div className="text-center py-8"><p className={`text-sm ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No items found</p></div>}
                                    </>
                                  )}

                                  {/* =========== CART PAGE =========== */}
                                  {currentPage === "cart" && (
                                    <div className="space-y-3">
                                      {cartCount > 0 ? (
                                        <div className={`${tmpl.cardRadius} ${cardStyleClass} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3`}>
                                          <div className="flex items-center justify-between mb-3"><h3 className={`text-sm font-bold ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>Cart ({cartCount})</h3><button onClick={() => setCartItems({})} className="text-xs text-red-500 font-medium">Clear All</button></div>
                                          <div className="space-y-2 mb-3">
                                            {Object.entries(cartItems).map(([id, qty]) => {
                                              const item = allMenuItems.find(i => i.id === Number(id));
                                              if (!item) return null;
                                              return (
                                                <div key={id} className={`flex gap-2 items-center p-2 ${tmpl.cardRadius} ${isNeonTemplate || isDarkMode ? "bg-white/5" : "bg-background"}`}>
                                                  <div className={`w-12 h-12 ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0`}><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>
                                                  <div className="flex-1 min-w-0"><h4 className={`text-xs font-bold ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{item.name}</h4><p className="text-[10px]" style={{ color: effectiveAccent }}>{item.price} EGP × {qty}</p></div>
                                                  <div className="flex items-center gap-1">
                                                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center rounded-full border" style={{ borderColor: effectiveAccent + "50", color: effectiveAccent }}><Minus className="w-3 h-3" /></button>
                                                    <span className={`text-xs font-bold w-5 text-center ${isNeonTemplate || isDarkMode ? "text-white" : "text-slate-700"}`}>{qty}</span>
                                                    <button onClick={() => addToCart(item.id)} className="w-6 h-6 flex items-center justify-center rounded-full text-white" style={{ background: effectiveAccent }}><Plus className="w-3 h-3" /></button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          <div className={`border-t pt-3 space-y-2 ${isNeonTemplate || isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                                            <div className="flex justify-between text-xs"><span className={isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}>Subtotal</span><span className={`font-bold ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{cartTotal.toFixed(0)} EGP</span></div>
                                            <div className="flex justify-between text-xs"><span className={isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}>Delivery</span><span className={isNeonTemplate || isDarkMode ? "text-green-400" : "text-green-600"}>Free</span></div>
                                            <div className={`flex justify-between text-sm font-bold pt-2 border-t ${isNeonTemplate || isDarkMode ? "border-slate-700 text-white" : "border-slate-200 text-foreground"}`}><span>Total</span><span style={{ color: effectiveAccent }}>{cartTotal.toFixed(0)} EGP</span></div>
                                            <button className={`w-full py-3 ${tmpl.btnRadius} font-bold text-sm text-white mt-2`} style={{ background: effectiveGradient }}>Checkout →</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                          <ShoppingCart className={`w-16 h-16 mb-3 ${isNeonTemplate || isDarkMode ? "text-muted-foreground" : "text-slate-300"}`} />
                                          <p className={`text-sm mb-2 ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Your cart is empty</p>
                                          <button onClick={() => setCurrentPage("menu")} className={`text-xs px-4 py-2 ${tmpl.btnRadius}`} style={{ color: effectiveAccent, border: `1px solid ${effectiveAccent}30`, background: effectiveAccent + "08" }}>Browse Menu</button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* =========== PROFILE PAGE =========== */}
                                  {currentPage === "profile" && (
                                    <div className="space-y-3">
                                      <div className={`relative ${tmpl.cardRadius} overflow-hidden p-4 text-white`} style={{ background: effectiveGradient }}>
                                        <div className="absolute inset-0 bg-black/10" />
                                        <div className="relative z-10 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-2 flex items-center justify-center"><User className="w-8 h-8" /></div><h3 className="text-base font-bold mb-0.5">{displayName}</h3><p className="text-xs opacity-80">{bio || "Member since 2024"}</p></div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">{[{ v: cartCount, l: "Orders", icon: "📦" }, { v: rating.toFixed(1), l: "Rating", icon: "⭐" }, { v: favorites.length, l: "Saved", icon: "❤️" }].map(({ v, l, icon }) => (<div key={l} className={`${tmpl.cardRadius} ${statsCardClass} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-2 text-center`}><span className="text-sm">{icon}</span><div className="text-lg font-bold" style={{ color: effectiveAccent }}>{v}</div><div className={`text-[10px] ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{l}</div></div>))}</div>
                                      {/* Achievements */}
                                      <div className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3`}>
                                        <h4 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}><Award size={14} style={{ color: effectiveAccent }} />Achievements</h4>
                                        <div className="flex gap-2">{[{ emoji: "🏆", label: "First Order" }, { emoji: "⭐", label: "5 Reviews" }, { emoji: "🔥", label: "Loyal Fan" }].map(a => (<div key={a.label} className={`flex-1 text-center p-2 ${tmpl.cardRadius} ${isNeonTemplate || isDarkMode ? "bg-white/5" : "bg-background"}`}><div className="text-lg mb-0.5">{a.emoji}</div><div className={`text-[9px] ${isNeonTemplate || isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{a.label}</div></div>))}</div>
                                      </div>
                                      <div className="space-y-1">{[{ icon: Bookmark, label: `Favorites (${favorites.length})` }, { icon: ShoppingCart, label: "Order History" }, { icon: MapPin, label: "Saved Addresses" }, { icon: Bell, label: "Notifications" }].map(({ icon: Icon, label }) => (<div key={label} className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3 flex items-center justify-between cursor-pointer`}><div className="flex items-center gap-2"><Icon className="w-4 h-4" style={{ color: effectiveAccent }} /><span className={`text-xs font-medium ${isNeonTemplate || isDarkMode ? "text-white" : "text-foreground"}`}>{label}</span></div><ArrowRight className={`w-4 h-4 ${isNeonTemplate || isDarkMode ? "text-muted-foreground" : "text-slate-400"}`} /></div>))}</div>
                                    </div>
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center p-8"><Smartphone className="w-16 h-16 text-slate-300 mb-4" /><p className="text-slate-400 text-sm">Enter a business name to see the preview</p></div>
                            )}
                          </div>
                        </div>

                        {/* ===== UNIFIED FLOATING DOCK (PREVIEW MODE) ===== */}
                        {isPreviewVisible && activeNavPlacement !== "side" && (
                          <FloatingDock
                            previewMode
                            previewPage={currentPage}
                            onPreviewNavigate={navigatePage}
                            cartBadgeCount={cartCount}
                            previewAccentColor={effectiveAccent}
                            isDarkLikePreview={isNeonTemplate || isDarkMode}
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                    </motion.div>
                  </motion.div>
                </div>
                <div className="xl:hidden mt-4 space-y-3">                  <div className="mx-auto w-full max-w-[300px] rounded-2xl border border-white/10 bg-slate-900/60 p-1.5 backdrop-blur">
                    <div className="grid grid-cols-3 gap-1">
                      {([
                        { id: "mobile", label: t("موبايل", "Mobile") },
                        { id: "tablet", label: t("تابلت", "Tablet") },
                        { id: "desktop", label: t("ديسكتوب", "Desktop") },
                      ] as const).map((device) => (
                        <button
                          key={device.id}
                          onClick={() => setDeviceView(device.id)}
                          className={`rounded-xl py-2 text-[11px] font-semibold transition-all ${deviceView === device.id ? "text-white" : "text-slate-300 hover:text-white"}`}
                          style={deviceView === device.id ? { background: effectiveGradient } : { background: "rgba(255,255,255,0.04)" }}
                        >
                          {device.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-4 hidden xl:block"><span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{deviceView} Preview — {tmpl.name} Template</span></div>

                {/* Cool Animated Scroll Hint — visible on all devices, permanent */}
                {deviceView === "mobile" && (
                  <div className="absolute top-[60%] xl:top-1/2 left-[-15px] xl:-left-[170px] z-[250] pointer-events-none select-none">
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                      <motion.div
                        animate={{ y: [-4, 4, -4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_-5px_rgba(34,211,238,0.5)] relative"
                      >
                        <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl"></div>
                        <div className="relative z-10 w-4 h-6 sm:w-5 sm:h-8 rounded-full border-[1.5px] border-cyan-400 flex justify-center pt-1 sm:pt-1.5 flex-shrink-0">
                          <motion.div animate={{ y: [0, 8, 0], opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="w-[3px] h-[6px] sm:w-[4px] sm:h-[8px] bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,1)]" />
                        </div>
                        <div className="relative z-10 flex flex-col items-start" dir="rtl">
                          <span className="text-[11px] sm:text-[13px] font-bold text-cyan-50 whitespace-nowrap drop-shadow-md leading-tight">
                            {t("جرّب تعمل سكرول", "Try scrolling")}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-cyan-300/80 font-medium whitespace-nowrap mt-0.5">
                            {t("للتصفح داخل الموبايل", "inside to explore")}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ========== RIGHT: QR & ACTIONS ========== */}
            {isPreviewVisible && (
              <motion.div className={`hidden xl:block xl:w-[280px] flex-shrink-0 order-3 ${studioLocked ? "pointer-events-none select-none opacity-70" : ""}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <div className="xl:sticky xl:top-24 space-y-4">

                  {/* ── SAVE STATUS CARD ── */}
                  <div className="bg-gradient-to-br from-primary/[0.08] via-cyan-50/60 to-violet-50/40 backdrop-blur-xl rounded-2xl border border-primary/20 p-5 relative overflow-hidden shadow-lg shadow-primary/[0.06]">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-primary/15 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.08] rounded-full blur-[50px]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${isAuthenticated ? 'bg-gradient-to-br from-primary to-cyan-500 shadow-primary/30' : 'bg-gradient-to-br from-slate-400 to-background0 shadow-slate-400/30'}`}>
                          {isSaving ? <Loader2 size={14} className="text-white animate-spin" /> : isAuthenticated ? <Cloud size={14} className="text-white" /> : <CloudOff size={14} className="text-white" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground block leading-tight">
                            {isAuthenticated ? 'Auto-Save' : 'Save Design'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {isAuthenticated
                              ? (isSaving ? 'Saving changes...' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Will save automatically')
                              : 'Login to enable auto-save'
                            }
                          </span>
                        </div>
                      </div>

                      {isAuthenticated ? (
                        <div className="space-y-2">
                          {/* Save status indicator */}
                          <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${lastSavedAt ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/5 border-primary/10'}`}>
                            {lastSavedAt ? (
                              <>
                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-emerald-600 block">All changes saved</span>
                                  <span className="text-[9px] text-emerald-500/70 block">Synced to your account</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <Cloud size={14} className="text-primary/60 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-slate-500 block">Ready to save</span>
                                  <span className="text-[9px] text-slate-400 block">Changes auto-save in 2s</span>
                                </div>
                              </>
                            )}
                          </div>
                          {/* Manual save button */}
                          <button
                            onClick={handleManualSave}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            {isSaving ? "Saving..." : "Save Now"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowLoginPrompt(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
                        >
                          <LogIn size={14} />
                          Login to Save
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── QR CODE CARD ── */}
                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-primary/10 p-5 relative overflow-hidden shadow-lg shadow-primary/[0.03]">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3"><QrCode size={16} className="text-primary" /><span className="text-sm font-bold text-foreground">Scan to Preview</span></div>
                      <div className="bg-white p-4 rounded-xl mb-3 inline-block shadow-sm">
                        <Suspense fallback={<div className="w-[140px] h-[140px] bg-gray-100 animate-pulse rounded" />}>
                          <QRCodeSVG
                            value={savedDesignId
                              ? getPreviewUrl(savedDesignId)
                              : `${window.location.origin}/demo?name=${encodeURIComponent(displayName)}&service=${serviceType}&theme=${selectedTheme}&template=${selectedTemplate}`
                            }
                            size={140} level="H" includeMargin={false} fgColor="#1e293b" bgColor="#ffffff"
                          />
                        </Suspense>
                      </div>
                      <div className="mb-3"><p className="text-xs text-slate-400 mb-1">Preview for</p><p className="text-sm font-bold text-primary">{displayName}</p></div>
                      {savedDesignId && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200/50">
                          <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1"><CheckCircle2 size={10} />Real-time preview enabled</p>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 mb-3"><Smartphone size={12} /><span>Use your phone camera to scan</span></div>
                      <button onClick={() => {
                        const link = savedDesignId
                          ? getPreviewUrl(savedDesignId)
                          : `${window.location.origin}/demo?name=${encodeURIComponent(displayName)}&service=${serviceType}&theme=${selectedTheme}&template=${selectedTemplate}`;
                        copyToClipboard(link, "Link copied!", "Failed to copy");
                      }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"><Copy size={12} />Copy Link</button>
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-violet-200/40 p-4 relative overflow-hidden shadow-lg shadow-violet-500/[0.03]">
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-violet-400/10 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10"><span className="text-xs font-bold text-slate-400 block mb-3">Quick Actions</span><div className="grid grid-cols-2 gap-2">{[{ onClick: copyShareLink, icon: Share2, color: "text-cyan-500", label: "Share" }, { onClick: exportData, icon: Download, color: "text-green-500", label: "Export" }, { onClick: exportToCSV, icon: FileDown, color: "text-blue-500", label: "CSV" }, { onClick: () => window.print(), icon: ExternalLink, color: "text-violet-500", label: "Print" }].map(({ onClick, icon: Icon, color, label }) => (<button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/80 border border-slate-200/60 hover:bg-white transition-all"><Icon size={14} className={color} /><span className="text-[10px] text-slate-400 font-medium">{label}</span></button>))}</div></div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Shortcuts</span>
                    <div className="space-y-1.5 text-[10px]">{[{ key: "Ctrl+E", action: "Export CSV" }, { key: "Ctrl+I", action: "Add Item" }].map(({ key, action }) => (<div key={key} className="flex items-center justify-between"><span className="text-slate-400">{action}</span><kbd className="px-1.5 py-0.5 rounded bg-muted text-slate-400 font-mono text-[9px]">{key}</kbd></div>))}</div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* ============ BOTTOM CTA ============ */}
          <motion.div className="mt-12 sm:mt-16 lg:mt-20 text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">{t("هذه مجرد معاينة. المنتج النهائي سيكون أكثر احترافية!", "This is just a preview. The real product will be even more professional!")}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-400">
              {[
                { icon: CheckCircle2, text: t("تصميم احترافي", "Professional Design") },
                { icon: CheckCircle2, text: t("2 إعدادات مميزة", "2 Signature Presets") },
                { icon: CheckCircle2, text: t("مكوّنات قابلة للدمج والتخصيص", "Mix-and-Match Components") },
                ...(isPreviewVisible ? [{ icon: TrendingUp, text: t(`${stats.totalItems} عنصر`, `${stats.totalItems} Items`) }, { icon: Eye, text: t("معاينة مباشرة", "Live Preview") }] : [])
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary" />{text}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============ IMAGE ZOOM MODAL ============ */}
      <AnimatePresence>{selectedImage && (() => {
        const zoomedItem = allMenuItems.find(i => i.image === selectedImage);
        const zoomedIndex = filteredItems.findIndex(i => i.image === selectedImage);
        const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); if (zoomedIndex > 0) setSelectedImage(filteredItems[zoomedIndex - 1].image); };
        const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); if (zoomedIndex < filteredItems.length - 1) setSelectedImage(filteredItems[zoomedIndex + 1].image); };
        return (
          <motion.div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            onKeyDown={(e) => { if (e.key === "Escape") setSelectedImage(null); if (e.key === "ArrowLeft") handlePrev(e as unknown as React.MouseEvent); if (e.key === "ArrowRight") handleNext(e as unknown as React.MouseEvent); }}
            tabIndex={0} style={{ outline: "none" }}>
            <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 text-white/60 hover:text-white z-10"><X className="w-6 h-6" /></button>
            {zoomedIndex > 0 && <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><ChevronDown className="w-5 h-5 -rotate-90" /></button>}
            {zoomedIndex < filteredItems.length - 1 && <button onClick={handleNext} className="absolute right-16 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><ChevronDown className="w-5 h-5 rotate-90" /></button>}
            <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              <motion.img src={selectedImage} alt="Zoomed" className="max-w-4xl w-full max-h-[75vh] object-contain rounded-lg" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} />
              {zoomedItem && (
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{zoomedItem.name}</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="font-bold" style={{ color: effectiveAccent }}>{zoomedItem.price} EGP</span>
                    {zoomedItem.rating && <span className="text-yellow-400 text-sm flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400" />{zoomedItem.rating}</span>}
                    {zoomedIndex + 1 > 0 && <span className="text-white/40 text-xs">{zoomedIndex + 1} / {filteredItems.length}</span>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}</AnimatePresence>

      {/* ============ QR MODAL ============ */}
      <AnimatePresence>{showQRModal && (<motion.div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRModal(false)}><motion.div className="bg-white rounded-3xl p-8 border border-slate-200 max-w-md w-full text-center relative shadow-2xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}><button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"><X size={18} /></button><QrCode size={24} className="text-primary mx-auto mb-3" /><h3 className="text-xl font-bold text-foreground mb-1">Scan QR Code</h3><p className="text-sm text-muted-foreground mb-6">Open this preview on your mobile device</p><div className="bg-background p-6 rounded-2xl mb-6 inline-block"><Suspense fallback={<div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded" />}><QRCodeSVG value={savedDesignId ? getPreviewUrl(savedDesignId) : `${window.location.origin}/demo?name=${encodeURIComponent(displayName)}&service=${serviceType}&theme=${selectedTheme}&template=${selectedTemplate}`} size={200} level="H" includeMargin={true} fgColor="#1e293b" bgColor="#f8fafc" /></Suspense></div><p className="text-sm font-bold text-primary mb-1">{displayName}</p>{savedDesignId && <p className="text-xs text-emerald-500 mb-2 flex items-center justify-center gap-1"><CheckCircle2 size={12} />Full design preview enabled</p>}<p className="text-xs text-muted-foreground mb-4">Point your phone camera at the QR code</p><button onClick={() => { const link = savedDesignId ? getPreviewUrl(savedDesignId) : `${window.location.origin}/demo?name=${encodeURIComponent(displayName)}&service=${serviceType}&theme=${selectedTheme}&template=${selectedTemplate}`; copyToClipboard(link, "Link copied!", "Failed to copy"); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"><Copy size={14} />Copy Link Instead</button></motion.div></motion.div>)}</AnimatePresence>

      {/* ============ LOGIN PROMPT MODAL ============ */}
      <AnimatePresence>{showLoginPrompt && (
        <motion.div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLoginPrompt(false)}>
          <motion.div className="bg-white rounded-3xl max-w-sm w-full relative shadow-2xl overflow-hidden" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-cyan-500 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                  <LogIn size={24} />
                </div>
                <h3 className="text-lg font-bold">Login to Save</h3>
                <p className="text-xs text-white/70 mt-1">Sign in to save your design to your account</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-violet-50 to-cyan-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Why login?</p>
                {[
                  { icon: "💾", text: "Your design auto-saves as you work" },
                  { icon: "📱", text: "Access your designs from any device" },
                  { icon: "🎨", text: "Admin can build your real website from it" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="text-sm">{icon}</span>{text}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowLoginPrompt(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-background transition-all">
                  Later
                </button>
                <button onClick={handleLoginRedirect} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  <LogIn size={16} /> Login Now
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400">
                Don't have an account?{" "}
                <button onClick={() => { setShowLoginPrompt(false); navigate('/client-signup'); }} className="text-primary font-bold hover:underline">Sign up free</button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      {/* ============ TOOL INFO MODAL ============ */}
      <AnimatePresence>{showStudioInfoModal && (
        <motion.div
          className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowStudioInfoModal(false)}
        >
          <motion.div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 shadow-2xl"
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-500 font-bold">{t("استوديو التصميم المباشر", "Live Design Studio")}</p>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{t("معاينة ميزة قريبة", "Coming Soon Preview")}</h3>
              </div>
              <button onClick={() => setShowStudioInfoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p>
                {t("تتيح هذه الأداة للعملاء والأدمن تصميم معاينة تطبيق موبايل في الوقت الحقيقي عبر تعديل الهوية، والمحتوى، ونمط التخطيط، والكروت، والتنقل، والأزرار.", "This tool lets clients and admins design a mobile app preview in real time by changing branding, content, layout style, cards, navigation, and buttons.")}
              </p>
              <p>
                {t("وتُستخدم أيضًا للتصدير والمشاركة ومراجعة فكرة التطبيق قبل بناء النسخة الإنتاجية النهائية.", "It is also used to export, share, and review the app concept before building the final production app.")}
              </p>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_100%)] border border-amber-200 px-4 py-4 text-slate-700">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-600">{t("قريبًا", "Coming Soon")}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {t("الاستوديو قيد التطوير الفعلي الآن وسيفتح كمعمل أفكار تفاعلي في إصدار قادم.", "The studio is in active production and will open as an interactive concept lab in a future release.")}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.16em]">
                  <div className="rounded-xl border border-white bg-white/70 px-2 py-2 text-cyan-700">{t("الهوية", "Branding")}</div>
                  <div className="rounded-xl border border-white bg-white/70 px-2 py-2 text-emerald-700">{t("المعاينة", "Preview")}</div>
                  <div className="rounded-xl border border-white bg-white/70 px-2 py-2 text-amber-700">{t("التصدير", "Export")}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowStudioInfoModal(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white py-2.5 text-sm font-bold hover:opacity-90 transition-all"
            >
              Got It
            </button>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
      
      {/* Add / Edit Item Modal */}
      <AddItemModal
        open={showAddItem}
        onClose={() => { setShowAddItem(false); setEditingItem(null); }}
        onSave={handleModalSave}
        categories={categories}
        editingItem={editingItem}
        effectiveAccent={effectiveAccent}
      />
    </section>
  );
};

export default LivePreviewTool;
