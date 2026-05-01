/**
 * MobileDemoPage.tsx — Public Design Preview
 *
 * Supports two modes:
 *   1. /demo?id=UUID  — Loads full design from DB (all settings, real-time sync)
 *   2. /demo?name=X&service=Y&...  — Legacy URL params (basic preview)
 *
 * Real-time: polls `updated_at` every 4 s → smooth re-render on change (no flash).
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingCart, Plus, Minus, Star, Clock, Home, Search, User, X,
  Heart, Grid3x3, List, Bell, ZoomIn, Bookmark, MapPin,
  ArrowRight, Flame, Sparkles, Share2, Award, CheckCircle2,
  Wifi, Battery, Signal, Crown, Leaf, Zap as ZapIcon, RefreshCw,
  WifiOff,
} from "lucide-react";
import type { MenuItem } from "@/types";
import { defaultItemsByServiceType, serviceTypesConfig, baseThemes } from "@/features/live-preview/constants";
import { loadDesign } from "@/services/designService";
import { getTemplate } from "@/features/live-preview/templates";
import type { SavedDesign } from "@/types/dashboard";

/* ── Polling interval for live updates (ms) ──────────────────── */
const POLL_MS = 4000;

/* ═══════════════════════════════════════════════════════════════
   Derived helpers
═══════════════════════════════════════════════════════════════ */
const serviceIcon = (s: string) =>
  s === "restaurant" ? "🍽️" : s === "cafe" ? "☕" : s === "salon" ? "✂️" :
    s === "pharmacy" ? "💊" : s === "store" ? "🏪" : "🏢";

function buildTheme(design: Partial<SavedDesign>) {
  if (design.selected_theme && design.selected_theme !== "default" && design.selected_theme !== "custom") {
    const found = baseThemes.find(t => t.id === design.selected_theme);
    if (found) return { accent: found.accent, gradient: found.gradient };
  }
  if (design.selected_theme === "custom" && design.custom_theme) {
    return { accent: design.custom_theme.accent, gradient: design.custom_theme.gradient };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const MobileDemoPage = () => {
  const [searchParams] = useSearchParams();
  const designId = searchParams.get("id");

  /* ── Load state ────────────────────────────────────────────── */
  const [design, setDesign] = useState<Partial<SavedDesign> | null>(null);
  const [loading, setLoading] = useState(!!designId);
  const [loadFailed, setLoadFailed] = useState(false);   // DB error, but we can still show demo
  const [failReason, setFailReason] = useState<string>(""); // 'network' | 'permission' | 'unknown'
  const [notFound, setNotFound] = useState(false);     // 404 — design doesn't exist
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Derived settings (from DB or URL params) ─────────────── */
  const businessName = design?.business_name || searchParams.get("name") || "Your Business";
  const serviceType = design?.service_type || searchParams.get("service") || "restaurant";
  const selectedTheme = design?.selected_theme || searchParams.get("theme") || "default";
  const templateId = design?.selected_template || searchParams.get("template") || "aether";
  const isDarkMode = design?.is_dark_mode ?? searchParams.get("dark") === "true";
  const glassEffect = design?.glass_effect ?? false;
  const activeTexture = design?.active_texture ?? "none";
  const fontSize = design?.font_size ?? 1;
  const showRatings = design?.show_ratings ?? true;
  const showTime = design?.show_time ?? true;
  const showFeatured = design?.show_featured ?? true;
  const viewMode = (design?.view_mode as "list" | "grid") || "list";
  const customItems = useMemo(() => (design?.custom_items as MenuItem[]) || [], [design?.custom_items]);

  /* ── Template & theme ─────────────────────────────────────── */
  const tmpl = useMemo(() => getTemplate(templateId), [templateId]);
  const isNeonTemplate = !!tmpl.forceDark;

  const resolvedTheme = useMemo(() => {
    const t = buildTheme({ selected_theme: selectedTheme, custom_theme: design?.custom_theme as SavedDesign["custom_theme"] });
    return t;
  }, [selectedTheme, design?.custom_theme]);

  const effectiveAccent = resolvedTheme?.accent || tmpl.accent;
  const effectiveGradient = resolvedTheme?.gradient || `linear-gradient(135deg, ${tmpl.accent}, ${tmpl.accent}dd)`;
  const headerTextWhite = !!resolvedTheme || !!tmpl.forceDark || tmpl.headerBg.includes("gradient");

  /* ── Menu items ───────────────────────────────────────────── */
  const currentServiceConfig = useMemo(
    () => serviceTypesConfig.find(s => s.id === serviceType) || serviceTypesConfig[0],
    [serviceType]
  );
  const categories = currentServiceConfig.categories;
  const menuItems = useMemo(() => defaultItemsByServiceType[serviceType] || [], [serviceType]);
  const allMenuItems = useMemo(() => [...menuItems, ...customItems], [menuItems, customItems]);

  /* ── UI state ─────────────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState<"home" | "menu" | "cart" | "profile">("menu");
  const [cartItems, setCartItems] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewModeLocal, setViewModeLocal] = useState<"list" | "grid">(viewMode);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [notifications] = useState(3);
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* ── Promo cycle ───────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setPromoIndex(p => (p + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  /* ── Load design from DB ────────────────────────────────────── */
  const fetchDesign = useCallback(async (silent = false) => {
    if (!designId) return;
    if (!silent) setLoading(true);
    if (!silent) setLoadFailed(false);
    if (!silent) setNotFound(false);

    // loadDesign never throws — returns { data, reason }
    const result = await loadDesign(designId);

    if (!result.data) {
      if (!silent) {
        if (result.reason === 'not_found') {
          setNotFound(true);    // 404 — show "link expired" screen
        } else {
          setLoadFailed(true);  // network / RLS / paused project → show sample + retry
          setFailReason(result.reason ?? 'unknown');
        }
        setLoading(false);
      }
      return;
    }

    const d = result.data;

    if (d.status === "archived") {
      if (!silent) { setNotFound(true); setLoading(false); }
      return;
    }

    // Smooth update: only re-render when data actually changed
    if (lastUpdated !== d.updated_at) {
      if (silent && lastUpdated !== null) {
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2500);
      }
      setDesign(d);
      setLastUpdated(d.updated_at);
      setIsLive(true);
      setLoadFailed(false);
    }

    if (!silent) setLoading(false);
  }, [designId, lastUpdated]);

  /* initial load */
  useEffect(() => { fetchDesign(false); }, [designId, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  /* real-time polling */
  useEffect(() => {
    if (!designId) return;
    pollRef.current = setInterval(() => fetchDesign(true), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [designId, fetchDesign]);

  /* sync viewMode from DB on first load */
  useEffect(() => { setViewModeLocal(viewMode); }, [viewMode]);
  useEffect(() => { setSelectedCategory("all"); }, [serviceType]);

  /* ── Cart helpers ─────────────────────────────────────────── */
  const addToCart = (id: number) => setCartItems(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const removeFromCart = (id: number) => setCartItems(p => {
    const n = { ...p };
    if (n[id] > 1) n[id]--; else delete n[id];
    return n;
  });
  const cartCount = useMemo(() => Object.values(cartItems).reduce((s, c) => s + c, 0), [cartItems]);
  const cartTotal = useMemo(() => Object.entries(cartItems).reduce((s, [id, qty]) => {
    const item = allMenuItems.find(i => i.id === Number(id));
    return s + (item ? parseFloat(item.price) * qty : 0);
  }, 0), [cartItems, allMenuItems]);

  /* ── Filtered items ────────────────────────────────────────── */
  const filteredItems = useMemo(() => {
    let items = selectedCategory === "all" ? allMenuItems : allMenuItems.filter(i => i.category === selectedCategory);
    if (searchQuery) items = items.filter(i =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return items;
  }, [allMenuItems, selectedCategory, searchQuery]);

  /* ── Share ─────────────────────────────────────────────────── */
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, url });
      } catch {
        // User canceled native share dialog; no fallback needed.
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  /* ═══════════════════════════════════════════════════════════ */
  /* RENDER HELPERS (same logic as LivePreviewTool)              */
  /* ═══════════════════════════════════════════════════════════ */

  const renderCategoryBtn = (cat: { id: string; name: string; icon: string }, isActive: boolean) => {
    const base = "flex items-center gap-1.5 whitespace-nowrap transition-all text-xs font-medium px-3 py-1.5";
    switch (tmpl.catStyle) {
      case "underline": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} border-b-2 ${isActive ? "border-current font-bold" : "border-transparent"}`} style={isActive ? { color: effectiveAccent } : { color: isNeonTemplate ? "#94a3b8" : "#64748b" }}><span>{cat.name}</span></button>;
      case "chip": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-xl ${isActive ? "text-white shadow-lg" : "bg-white text-slate-600 border border-slate-200"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "block": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-lg ${isActive ? "text-white font-bold" : "bg-amber-50 text-amber-800 border border-amber-200/50"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span className="uppercase text-[10px] font-bold tracking-wide">{cat.name}</span></button>;
      case "glow": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-lg border ${isActive ? "border-cyan-400/50 text-cyan-300" : "border-slate-700 text-slate-400"}`} style={isActive ? { boxShadow: `0 0 12px ${effectiveAccent}40`, background: `${effectiveAccent}15` } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "tag": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-full border-2 font-bold ${isActive ? "text-white border-transparent" : "text-orange-600 border-orange-200 bg-white"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      case "minimal": return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-full ${isActive ? "font-bold text-white" : "text-green-700 bg-green-50"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
      default: return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`${base} rounded-full ${isActive ? "text-white shadow-md" : "bg-white text-slate-600 border border-slate-200"}`} style={isActive ? { background: effectiveGradient } : {}}><span className="text-sm">{cat.icon}</span><span>{cat.name}</span></button>;
    }
  };

  const renderAddBtn = (itemId: number, small = false) => {
    const qty = cartItems[itemId] || 0;
    if (qty > 0) return (
      <div className="flex items-center gap-1 justify-center">
        <button onClick={() => removeFromCart(itemId)} className={`w-8 h-8 flex items-center justify-center ${tmpl.btnRadius} border transition-all`} style={{ borderColor: effectiveAccent + "50", color: effectiveAccent }}><Minus className="w-3 h-3" /></button>
        <span className={`text-sm font-bold min-w-[24px] text-center ${isNeonTemplate ? "text-cyan-300" : "text-slate-700"}`}>{qty}</span>
        <button onClick={() => addToCart(itemId)} className={`w-8 h-8 flex items-center justify-center ${tmpl.btnRadius} text-white`} style={{ background: effectiveAccent }}><Plus className="w-3 h-3" /></button>
      </div>
    );
    const sizeClass = small ? "py-2 text-[11px]" : "py-2.5 text-xs";
    switch (tmpl.btnStyle) {
      case "gradient": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 text-white`} style={{ background: effectiveGradient }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "ghost": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-medium flex items-center justify-center gap-1.5`} style={{ color: effectiveAccent }}><Plus className="w-3 h-3" />Add</button>;
      case "glow": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 border text-cyan-300 border-cyan-500/30`} style={{ boxShadow: `0 0 8px ${effectiveAccent}30` }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "filled": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 text-white`} style={{ background: effectiveAccent }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "soft": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5`} style={{ background: effectiveAccent + "15", color: effectiveAccent }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
      case "bold": return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-black flex items-center justify-center gap-1.5 text-white shadow-lg uppercase tracking-wide`} style={{ background: effectiveGradient }}><Plus className="w-3 h-3" />{small ? "ADD" : "ADD TO CART"}</button>;
      default: return <button onClick={() => addToCart(itemId)} className={`w-full ${sizeClass} ${tmpl.btnRadius} font-semibold flex items-center justify-center gap-1.5 border-2`} style={{ borderColor: effectiveAccent, color: effectiveAccent, background: effectiveAccent + "08" }}><Plus className="w-3 h-3" />{small ? "Add" : "Add to Cart"}</button>;
    }
  };

  const renderFeaturedBanner = () => {
    if (!showFeatured || selectedCategory !== "all") return null;
    const count = allMenuItems.filter(i => i.featured).length;
    switch (tmpl.featuredStyle) {
      case "card": return <div className="rounded-2xl p-4 text-white" style={{ background: effectiveGradient }}><div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4" /><span className="text-sm font-bold">Featured Collection</span></div><p className="text-xs opacity-80">{count} specially curated items</p></div>;
      case "strip": return <div className="flex items-center gap-2 py-2 border-b" style={{ borderColor: effectiveAccent + "30", color: effectiveAccent }}><Sparkles className="w-3 h-3" /><span className="text-xs font-medium tracking-wide uppercase">Featured items available</span></div>;
      case "glow": return <div className="rounded-xl p-3 border text-center" style={{ borderColor: effectiveAccent + "30", background: effectiveAccent + "08", boxShadow: `0 0 20px ${effectiveAccent}15` }}><span className="text-xs font-bold" style={{ color: effectiveAccent }}>⚡ {count} Featured Items</span></div>;
      case "overlay": return <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: effectiveGradient }}><div className="absolute inset-0 bg-black/20" /><div className="relative z-10"><div className="flex items-center gap-2 mb-0.5"><Award className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Premium Selection</span></div><p className="text-[10px] opacity-80">{count} exclusive featured items</p></div></div>;
      case "badge": return <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: effectiveAccent + "10" }}><Leaf className="w-4 h-4" style={{ color: effectiveAccent }} /><span className="text-xs font-bold" style={{ color: effectiveAccent }}>Chef's Picks — {count} items</span></div>;
      case "wave": return <div className="rounded-3xl p-4 text-white font-black" style={{ background: effectiveGradient }}><div className="flex items-center justify-between"><div><span className="text-xl">🔥</span><span className="text-sm ml-2 uppercase tracking-wider">HOT PICKS</span></div><span className="text-2xl">{count}</span></div></div>;
      default: return <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: effectiveAccent + "12", border: `1px solid ${effectiveAccent}20` }}><div style={{ color: effectiveAccent }}><div className="flex items-center gap-1.5 mb-0.5"><Flame className="w-3 h-3" /><span className="text-[10px] font-semibold uppercase tracking-wider">Featured Items</span></div><p className="text-xs opacity-80">Special discounts on featured items</p></div><div className="text-2xl">🔥</div></div>;
    }
  };

  const renderBottomNav = () => {
    type PT = "home" | "menu" | "cart" | "profile";
    const navItems: { id: PT; icon: typeof Home; label: string }[] = [
      { id: "home", icon: Home, label: "Home" }, { id: "menu", icon: Search, label: "Menu" },
      { id: "cart", icon: ShoppingCart, label: "Cart" }, { id: "profile", icon: User, label: "Profile" },
    ];
    const navBg = isNeonTemplate ? "bg-black border-t border-cyan-500/10" : isDarkMode ? "bg-slate-900 border-t border-slate-700" : "bg-white border-t border-slate-200";

    switch (tmpl.navStyle) {
      case "floating":
        return <div className="px-4 pb-3 pt-1 flex-shrink-0"><div className={`flex items-center justify-around py-2 rounded-2xl shadow-lg ${isDarkMode || isNeonTemplate ? "bg-slate-800" : "bg-white"}`}>{navItems.map(({ id, icon: Icon, label }) => (<button key={id} onClick={() => setCurrentPage(id)} className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${currentPage === id ? "scale-110" : ""}`}><div className={`p-1.5 rounded-lg ${currentPage === id ? "text-white" : ""}`} style={currentPage === id ? { background: effectiveGradient } : {}}><Icon className={`w-4 h-4 ${currentPage !== id ? (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400") : ""}`} /></div><span className={`text-[9px] font-medium ${currentPage !== id ? (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400") : ""}`} style={currentPage === id ? { color: effectiveAccent } : {}}>{label}</span>{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div></div>;
      case "minimal":
        return <div className={`${navBg} px-4 py-3 flex items-center justify-around flex-shrink-0`}>{navItems.map(({ id, icon: Icon }) => (<button key={id} onClick={() => setCurrentPage(id)} className="relative flex flex-col items-center gap-0.5 py-1 px-3"><Icon className={`w-5 h-5 ${currentPage === id ? "" : "text-slate-300"}`} style={currentPage === id ? { color: effectiveAccent } : {}} />{currentPage === id && <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: effectiveAccent }} />}{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-0 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div>;
      case "pill":
        return <div className={`${navBg} px-2 py-2 flex items-center justify-around flex-shrink-0`}>{navItems.map(({ id, icon: Icon, label }) => (<button key={id} onClick={() => setCurrentPage(id)} className={`relative flex items-center gap-1.5 py-2 px-3 rounded-full transition-all ${currentPage === id ? "text-white" : ""}`} style={currentPage === id ? { background: effectiveGradient } : {}}><Icon className={`w-4 h-4 ${currentPage !== id ? (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400") : ""}`} />{currentPage === id && <span className="text-[11px] font-bold">{label}</span>}{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div>;
      case "neon":
        return <div className="bg-black border-t border-cyan-500/10 px-2 py-2 flex items-center justify-around flex-shrink-0">{navItems.map(({ id, icon: Icon, label }) => (<button key={id} onClick={() => setCurrentPage(id)} className="relative flex flex-col items-center gap-0.5 py-1 px-3" style={currentPage === id ? { filter: `drop-shadow(0 0 6px ${effectiveAccent})` } : {}}><Icon className={`w-5 h-5 ${currentPage === id ? "" : "text-slate-600"}`} style={currentPage === id ? { color: effectiveAccent } : {}} /><span className={`text-[9px] font-medium ${currentPage === id ? "" : "text-slate-600"}`} style={currentPage === id ? { color: effectiveAccent } : {}}>{label}</span>{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 rounded-full text-[8px] text-white flex items-center justify-center font-bold" style={{ background: effectiveAccent }}>{cartCount}</span>}</button>))}</div>;
      case "dots":
        return <div className={`${navBg} px-2 py-2 flex items-center justify-around flex-shrink-0`}>{navItems.map(({ id, icon: Icon }) => (<button key={id} onClick={() => setCurrentPage(id)} className="relative flex flex-col items-center gap-1 py-1 px-3"><Icon className={`w-5 h-5 ${currentPage === id ? "" : (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400")}`} style={currentPage === id ? { color: effectiveAccent } : {}} />{currentPage === id ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: effectiveAccent }} /> : <div className="w-1.5 h-1.5" />}{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div>;
      case "block":
        return <div className={`${navBg} px-1 py-1 flex items-center justify-around flex-shrink-0 gap-1`}>{navItems.map(({ id, icon: Icon, label }) => (<button key={id} onClick={() => setCurrentPage(id)} className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${currentPage === id ? "text-white font-bold" : ""}`} style={currentPage === id ? { background: effectiveGradient } : {}}><Icon className={`w-4 h-4 ${currentPage !== id ? (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400") : ""}`} /><span className={`text-[10px] ${currentPage !== id ? (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400") : "font-bold"}`}>{label}</span>{id === "cart" && cartCount > 0 && <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div>;
      default:
        return <div className={`${navBg} px-2 py-2 flex items-center justify-around flex-shrink-0`}>{navItems.map(({ id, icon: Icon, label }) => (<button key={id} onClick={() => setCurrentPage(id)} className="relative flex flex-col items-center gap-0.5 py-1 px-3"><Icon className={`w-5 h-5 ${currentPage === id ? "" : (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400")}`} style={currentPage === id ? { color: effectiveAccent } : {}} /><span className={`text-[10px] font-medium ${currentPage === id ? "" : (isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400")}`} style={currentPage === id ? { color: effectiveAccent } : {}}>{label}</span>{id === "cart" && cartCount > 0 && <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{cartCount}</span>}</button>))}</div>;
    }
  };

  /* ── LOADING ───────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#00bcd4,#6366f1)" }}>
        <RefreshCw className="w-6 h-6 text-white animate-spin" />
      </div>
      <p className="text-slate-300 text-sm font-medium">Loading your design...</p>
    </div>
  );

  /* ── ERROR ─────────────────────────────────────────────────── */
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4">
        <WifiOff className="w-7 h-7 text-rose-400" />
      </div>
      <h2 className="text-lg font-bold mb-2">Preview Unavailable</h2>
      <p className="text-slate-400 text-sm max-w-xs">{error}</p>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════ */
  /* THE FULL APP PREVIEW                                        */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-slate-950 overflow-hidden">
      {/* ── Load-failed banner (shows demo, warns about DB) ────── */}
      {loadFailed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-[11px] font-semibold py-2 px-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {failReason === 'network' ? 'Cannot reach database — check your connection or unpause Supabase' :
                failReason === 'permission' ? 'Database access denied — run DATABASE_SAVED_DESIGNS.sql in Supabase' :
                  'Could not load design from database — showing sample preview'}
            </span>
          </span>
          <button onClick={() => setRetryCount(c => c + 1)} className="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-bold hover:bg-white/30 transition-colors whitespace-nowrap flex-shrink-0">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Live update badge ───────────────────────────── */}
      {isLive && !loadFailed && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1.5 text-[11px] font-semibold transition-all duration-500 ${justUpdated ? "bg-emerald-500 text-white" : "bg-slate-900/80 backdrop-blur-sm text-slate-400"}`}>
          {justUpdated ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Design updated — refreshed live</>
          ) : (
            <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live preview · updates automatically</>
          )}
        </div>
      )}

      {/* ── Phone shell ───────────────────────────────────── */}
      <div
        className={`w-full max-w-[430px] min-h-screen flex flex-col shadow-2xl relative ${isDarkMode ? tmpl.screenBgDark : tmpl.screenBg}`}
        style={{ fontSize: `${fontSize}rem`, marginTop: (isLive && !loadFailed) ? "28px" : loadFailed ? "40px" : 0 }}
      >
        {/* Texture overlay */}
        {activeTexture !== "none" && (
          <div className="absolute inset-0 z-50 pointer-events-none opacity-[0.08] mix-blend-overlay"
            style={{ backgroundImage: activeTexture === "noise" ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` : activeTexture === "grid" ? `linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)` : `radial-gradient(#000 1px,transparent 1px)`, backgroundSize: activeTexture === "grid" ? "20px 20px" : activeTexture === "dots" ? "10px 10px" : "auto" }} />
        )}

        {/* Glass frost layer */}
        {glassEffect && <div className="absolute inset-0 z-10 pointer-events-none bg-white/5 backdrop-blur-[2px]" />}

        {/* Status bar */}
        <div className={`px-4 py-1.5 flex items-center justify-between text-[11px] flex-shrink-0 z-20 ${isNeonTemplate || isDarkMode ? "bg-black text-white" : "bg-slate-900 text-white"}`}>
          <span className="font-medium">9:41</span>
          <div className="flex items-center gap-1.5"><Signal size={11} /><Wifi size={11} /><Battery size={11} /></div>
        </div>

        {/* App header — template-aware */}
        <div
          className={`px-4 py-3 flex items-center justify-between relative overflow-hidden flex-shrink-0 z-20 ${glassEffect ? "backdrop-blur-md bg-white/5 border-b border-white/10" : isDarkMode ? tmpl.headerBgDark : (resolvedTheme ? "" : tmpl.headerBg)}`}
          style={resolvedTheme && !glassEffect ? { background: resolvedTheme.gradient } : (!glassEffect && headerTextWhite ? { background: effectiveGradient } : {})}
        >
          <div className="relative z-10 flex-1">
            {tmpl.headerShowSubtitle && <p className={`text-[9px] uppercase tracking-[0.2em] mb-0.5 ${headerTextWhite || glassEffect ? "text-white/60" : "text-slate-400"}`}>Preview</p>}
            <p className={`${tmpl.headerNameSize} font-bold ${headerTextWhite || glassEffect ? "text-white" : "text-slate-900"} ${templateId === "bold" ? "uppercase tracking-wide" : ""} ${templateId === "elegant" ? "tracking-wide" : ""}`}>{businessName}</p>
            {tmpl.headerShowRating && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                <span className={`text-[10px] ${headerTextWhite || glassEffect ? "text-white/80" : "text-slate-600"}`}>4.8</span>
                <span className={`text-[10px] ${headerTextWhite || glassEffect ? "text-white/50" : "text-slate-400"}`}>· Open Now</span>
              </div>
            )}
          </div>
          <div className="relative z-10 flex items-center gap-2">
            {currentPage === "menu" && (
              <button onClick={() => setShowSearch(s => !s)} className={`p-2 rounded-xl transition-colors ${showSearch ? "bg-white/20" : ""}`}>
                <Search className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white" : "text-slate-700"}`} />
              </button>
            )}
            <button onClick={() => setViewModeLocal(v => v === "list" ? "grid" : "list")} className="p-2 rounded-xl">
              {viewModeLocal === "list" ? <Grid3x3 className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white/70" : "text-slate-500"}`} /> : <List className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white/70" : "text-slate-500"}`} />}
            </button>
            <button onClick={handleShare} className="p-2 rounded-xl">
              <Share2 className={`w-4 h-4 ${headerTextWhite || glassEffect ? "text-white/70" : "text-slate-500"}`} />
            </button>
            <div className="relative">
              <ShoppingCart className={`w-5 h-5 ${headerTextWhite || glassEffect ? "text-white" : "text-slate-700"}`} />
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">{cartCount}</span>}
            </div>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && currentPage === "menu" && (
          <div className={`px-4 py-2 border-b z-20 ${isNeonTemplate ? "bg-slate-900 border-slate-800" : isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={`Search ${currentServiceConfig.itemLabel}...`}
                className={`w-full pl-10 pr-8 py-2 text-sm rounded-xl border focus:outline-none ${isNeonTemplate || isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
            </div>
          </div>
        )}

        {/* Main scroll area */}
        <div className="flex-1 overflow-y-auto z-20" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <div className="p-3 space-y-3 pb-6">

            {/* HOME */}
            {currentPage === "home" && (
              <div className="space-y-3">
                <div className={`relative ${tmpl.cardRadius} overflow-hidden`} style={{ minHeight: 120 }}>
                  <div key={promoIndex} className="p-4 text-white h-full" style={{ background: promoIndex === 0 ? effectiveGradient : promoIndex === 1 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "linear-gradient(135deg,#8b5cf6,#6366f1)", animationName: "fadeIn", animationDuration: "0.4s" }}>
                    {promoIndex === 0 && <div><h3 className="text-lg font-bold mb-1">Welcome to {businessName}</h3><p className="text-xs opacity-90">Explore our amazing offerings</p></div>}
                    {promoIndex === 1 && <div><div className="flex items-center gap-1 mb-1"><Flame className="w-4 h-4" /><span className="text-sm font-bold uppercase tracking-wide">Today's Special</span></div><p className="text-xs opacity-90">20% off on all featured items</p></div>}
                    {promoIndex === 2 && <div><div className="flex items-center gap-1 mb-1"><ZapIcon className="w-4 h-4" /><span className="text-sm font-bold">New Arrivals</span></div><p className="text-xs opacity-90">Check out our latest additions</p></div>}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">{[0, 1, 2].map(i => <div key={i} className={`h-1.5 rounded-full transition-all bg-white ${promoIndex === i ? "w-5 opacity-100" : "w-1.5 opacity-40"}`} />)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: allMenuItems.length, l: "Items", icon: "📦" }, { v: "4.8", l: "Rating", icon: "⭐" }, { v: allMenuItems.filter(i => i.featured).length, l: "Featured", icon: "🔥" }].map(({ v, l, icon }) => (
                    <div key={l} className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3 text-center`}>
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="text-xl font-bold" style={{ color: effectiveAccent }}>{v}</div>
                      <div className={`text-[11px] ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{l}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className={`text-sm font-bold mb-2 ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>Most Popular</h4>
                  <div className="space-y-2">
                    {filteredItems.filter(i => i.featured).slice(0, 3).map(item => (
                      <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-2.5 flex gap-2.5`}>
                        <div className={`w-13 h-13 ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0`} style={{ width: 52, height: 52 }}>
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className={`text-sm font-bold ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{item.name}</h5>
                          <p className={`text-[11px] line-clamp-1 ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                          <span className="text-sm font-bold" style={{ color: effectiveAccent }}>{item.price} EGP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setCurrentPage("menu")} className={`w-full py-3 ${tmpl.btnRadius} font-semibold text-sm flex items-center justify-center gap-2 text-white`} style={{ background: effectiveGradient }}>
                  Browse All Menu <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* MENU */}
            {currentPage === "menu" && (
              <>
                {/* Categories */}
                <div className={`flex gap-1.5 overflow-x-auto pb-1.5 -mx-3 px-3 ${tmpl.catStyle === "underline" ? "border-b border-slate-200" : ""}`} style={{ scrollbarWidth: "none" }}>
                  {categories.map(cat => renderCategoryBtn(cat, selectedCategory === cat.id))}
                </div>

                {renderFeaturedBanner()}

                {/* Items — list mode */}
                {viewModeLocal === "list" ? (
                  <div className="space-y-2">
                    {filteredItems.map(item => {
                      // Overlay card style (elegant)
                      if (tmpl.cardOverlayText) return (
                        <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} ${isDarkMode ? tmpl.cardBorderDark : tmpl.cardBorder} overflow-hidden relative group`}>
                          <div className="relative h-36 cursor-pointer" onClick={() => setSelectedImage(item.image)}>
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <div className="flex items-start justify-between mb-0.5">
                                <h3 className="font-bold text-sm">{item.name}</h3>
                                <span className="font-bold text-sm" style={{ color: effectiveAccent }}>{item.price} EGP</span>
                              </div>
                              <p className="text-[11px] text-white/70 line-clamp-1 mb-1.5">{item.description}</p>
                              {(showRatings || showTime) && (
                                <div className="flex items-center gap-2 text-[11px] text-white/60">
                                  {item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{item.rating}</div>}
                                  {item.time && showTime && <div className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{item.time}</div>}
                                </div>
                              )}
                            </div>
                            {item.featured && showFeatured && <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold text-white rounded-full" style={{ background: effectiveGradient }}><Crown className="w-2.5 h-2.5 inline mr-0.5" />Premium</div>}
                            <button onClick={e => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute top-2 left-2 p-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                              <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"}`} />
                            </button>
                          </div>
                          <div className="p-2.5">{renderAddBtn(item.id)}</div>
                        </div>
                      );

                      // Standard list card
                      return (
                        <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} overflow-hidden ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder}`}>
                          <div className="flex gap-2.5 p-2.5">
                            <div className={`relative ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0 cursor-pointer`} style={{ width: 80, height: 80 }} onClick={() => setSelectedImage(item.image)}>
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute inset-0 bg-black/0 active:bg-black/10 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white opacity-0 active:opacity-100 transition-opacity" />
                              </div>
                              {item.featured && showFeatured && <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold flex items-center gap-0.5 z-10"><Star className="w-2 h-2 fill-white" /></div>}
                              <button onClick={e => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute bottom-0.5 left-0.5 p-1 bg-white/90 rounded-full z-10">
                                <Heart className={`w-3 h-3 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5 mb-0.5">
                                <h3 className={`font-bold text-sm leading-tight ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{item.name}</h3>
                                <span className="font-bold whitespace-nowrap text-sm" style={{ color: effectiveAccent }}>{item.price} EGP</span>
                              </div>
                              <p className={`mb-1.5 line-clamp-2 text-xs ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                              {(showRatings || showTime) && (
                                <div className={`flex items-center gap-2 text-[11px] mb-1.5 ${isDarkMode || isNeonTemplate ? "text-slate-500" : "text-slate-400"}`}>
                                  {item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{item.rating}</div>}
                                  {item.time && showTime && <div className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{item.time}</div>}
                                </div>
                              )}
                              {renderAddBtn(item.id)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Grid mode */
                  <div className="grid grid-cols-2 gap-2">
                    {filteredItems.map(item => (
                      <div key={item.id} className={`${tmpl.cardRadius} ${tmpl.cardShadow} overflow-hidden ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder}`}>
                        <div className="relative aspect-square cursor-pointer" onClick={() => setSelectedImage(item.image)}>
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          {item.featured && showFeatured && <div className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold z-10 text-white" style={{ background: effectiveGradient }}><Star className="w-2.5 h-2.5 fill-white inline" /></div>}
                          <button onClick={e => { e.stopPropagation(); setFavorites(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id]); }} className="absolute bottom-1.5 left-1.5 p-1.5 bg-white/90 rounded-full z-10">
                            <Heart className={`w-3 h-3 ${favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                          </button>
                        </div>
                        <div className="p-2.5">
                          <h3 className={`font-bold text-xs leading-tight mb-0.5 line-clamp-1 ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{item.name}</h3>
                          <p className={`mb-2 line-clamp-1 text-[11px] ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{item.description}</p>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold" style={{ color: effectiveAccent }}>{item.price} EGP</span>
                            {item.rating && showRatings && <div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-[11px]">{item.rating}</span></div>}
                          </div>
                          {renderAddBtn(item.id, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className={`text-sm ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>No items found</p>
                    {searchQuery && <button onClick={() => setSearchQuery("")} className="mt-2 text-xs" style={{ color: effectiveAccent }}>Clear search</button>}
                  </div>
                )}
              </>
            )}

            {/* CART */}
            {currentPage === "cart" && (
              <div className="space-y-3">
                {cartCount > 0 ? (
                  <div className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-sm font-bold ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>Cart ({cartCount})</h3>
                      <button onClick={() => setCartItems({})} className="text-xs text-red-500 font-medium">Clear All</button>
                    </div>
                    <div className="space-y-2 mb-3">
                      {Object.entries(cartItems).map(([id, qty]) => {
                        const item = allMenuItems.find(i => i.id === Number(id));
                        if (!item) return null;
                        return (
                          <div key={id} className={`flex gap-2.5 items-center p-2 ${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? "bg-white/5" : "bg-slate-50"}`}>
                            <div className={`w-14 h-14 ${tmpl.cardImageRadius} overflow-hidden flex-shrink-0`}>
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{item.name}</h4>
                              <p className="text-xs" style={{ color: effectiveAccent }}>{item.price} EGP × {qty}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center rounded-full border" style={{ borderColor: effectiveAccent + "50", color: effectiveAccent }}><Minus className="w-3 h-3" /></button>
                              <span className={`text-sm font-bold w-5 text-center ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-700"}`}>{qty}</span>
                              <button onClick={() => addToCart(item.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-white" style={{ background: effectiveAccent }}><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`border-t pt-3 space-y-2 ${isDarkMode || isNeonTemplate ? "border-slate-700" : "border-slate-200"}`}>
                      <div className="flex justify-between text-sm"><span className={isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}>Subtotal</span><span className={`font-bold ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{cartTotal.toFixed(0)} EGP</span></div>
                      <div className="flex justify-between text-sm"><span className={isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}>Delivery</span><span className={isDarkMode || isNeonTemplate ? "text-green-400" : "text-green-600"}>Free</span></div>
                      <div className={`flex justify-between text-sm font-bold pt-2 border-t ${isDarkMode || isNeonTemplate ? "border-slate-700 text-white" : "border-slate-200 text-slate-900"}`}><span>Total</span><span style={{ color: effectiveAccent }}>{cartTotal.toFixed(0)} EGP</span></div>
                      <button className={`w-full py-3.5 ${tmpl.btnRadius} font-bold text-base text-white mt-2`} style={{ background: effectiveGradient }}>Checkout →</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ShoppingCart className={`w-16 h-16 mb-4 ${isDarkMode || isNeonTemplate ? "text-slate-600" : "text-slate-200"}`} />
                    <p className={`text-sm mb-3 ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>Your cart is empty</p>
                    <button onClick={() => setCurrentPage("menu")} className={`text-sm px-5 py-2.5 ${tmpl.btnRadius}`} style={{ color: effectiveAccent, border: `1.5px solid ${effectiveAccent}30`, background: effectiveAccent + "08" }}>Browse Menu</button>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {currentPage === "profile" && (
              <div className="space-y-3">
                <div className={`relative ${tmpl.cardRadius} overflow-hidden p-5 text-white`} style={{ background: effectiveGradient }}>
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-3 flex items-center justify-center"><User className="w-10 h-10" /></div>
                    <h3 className="text-lg font-bold mb-0.5">{businessName}</h3>
                    <p className="text-xs opacity-70">Member since 2024</p>
                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/15 rounded-full">
                      <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                      <span className="text-xs font-bold">Premium Customer</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: cartCount, l: "Orders", icon: "📦" }, { v: "4.8", l: "Rating", icon: "⭐" }, { v: favorites.length, l: "Saved", icon: "❤️" }].map(({ v, l, icon }) => (
                    <div key={l} className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3 text-center`}>
                      <span className="text-xl">{icon}</span>
                      <div className="text-xl font-bold" style={{ color: effectiveAccent }}>{v}</div>
                      <div className={`text-[11px] ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3`}>
                  <h4 className={`text-sm font-bold mb-2.5 flex items-center gap-1.5 ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}><Award className="w-4 h-4" style={{ color: effectiveAccent }} />Achievements</h4>
                  <div className="flex gap-2">
                    {[{ emoji: "🏆", label: "First Order" }, { emoji: "⭐", label: "5 Reviews" }, { emoji: "🔥", label: "Loyal Fan" }].map(a => (
                      <div key={a.label} className={`flex-1 text-center p-2.5 ${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? "bg-white/5" : "bg-slate-50"}`}>
                        <div className="text-xl mb-0.5">{a.emoji}</div>
                        <div className={`text-[10px] ${isDarkMode || isNeonTemplate ? "text-slate-400" : "text-slate-500"}`}>{a.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[{ icon: Bookmark, label: `Favorites (${favorites.length})` }, { icon: ShoppingCart, label: "Order History" }, { icon: MapPin, label: "Saved Addresses" }, { icon: Bell, label: "Notifications" }].map(({ icon: Icon, label }) => (
                    <div key={label} className={`${tmpl.cardRadius} ${isDarkMode || isNeonTemplate ? tmpl.cardBgDark + " " + tmpl.cardBorderDark : tmpl.cardBg + " " + tmpl.cardBorder} p-3.5 flex items-center justify-between`}>
                      <div className="flex items-center gap-2.5"><Icon className="w-4 h-4" style={{ color: effectiveAccent }} /><span className={`text-sm font-medium ${isDarkMode || isNeonTemplate ? "text-white" : "text-slate-900"}`}>{label}</span></div>
                      <ArrowRight className={`w-4 h-4 ${isDarkMode || isNeonTemplate ? "text-slate-600" : "text-slate-300"}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div ref={msgEndRef} />
        </div>

        {/* Bottom nav */}
        {renderBottomNav()}

        {/* Powered by badge */}
        <div className={`flex items-center justify-center gap-1.5 py-2 text-[10px] border-t ${isDarkMode || isNeonTemplate ? "border-slate-800 text-slate-600 bg-black" : "border-slate-100 text-slate-300 bg-white"}`}>
          <span className="w-3 h-3 rounded-sm flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00bcd4,#6366f1)" }}>
            <svg viewBox="0 0 10 10" className="w-2 h-2 fill-white"><path d="M5 1l1.2 3.6H9L6.4 6.4 7.6 10 5 7.8 2.4 10 3.6 6.4 1 4.6h2.8z" /></svg>
          </span>
          Powered by Lumos
        </div>
      </div>

      {/* Image zoom overlay */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-5 right-5 text-white/60 hover:text-white"><X className="w-6 h-6" /></button>
          <img src={selectedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MobileDemoPage;
