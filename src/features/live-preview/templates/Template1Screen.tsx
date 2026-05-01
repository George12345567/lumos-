import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, Search, ShoppingCart, User, Settings, TrendingUp,
    Star, Heart, Plus, Minus, ArrowRight, Bell, ChevronRight,
    Package, MapPin, CreditCard, Shield, Globe, Moon,
    Award, Flame, Crown, Zap, CheckCircle2, Clock,
    Eye, X, Camera, Edit3, LogOut, HelpCircle,
    Truck, Gift, Target, Coffee, Sparkles,
    Wifi, Battery, Signal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
type T1Page = "home" | "products" | "cart" | "settings" | "progress" | "profile";

export type T1CardStyle = "elevated" | "flat" | "outlined" | "glass" | "neo" | "brutal" | "gradient" | "minimal";
export type T1NavStyle = "default" | "pill" | "floating" | "glass" | "minimal" | "dots" | "block" | "tab";
export type T1ButtonStyle = "rounded" | "pill" | "square" | "ghost" | "gradient" | "glow" | "soft" | "bold";

interface Template1ScreenProps {
    displayName: string;
    isDarkMode: boolean;
    accent: string;
    gradient: string;
    // Panel-controlled props
    tagline?: string;
    logoEmoji?: string;
    rating?: number;
    isOpen?: boolean;
    openTime?: string;
    closeTime?: string;
    showRatings?: boolean;
    showPrices?: boolean;
    showFeatured?: boolean;
    bio?: string;
    // Style props
    cardStyle?: T1CardStyle;
    navStyle?: T1NavStyle;
    buttonStyle?: T1ButtonStyle;
}

// ─── Demo Data ────────────────────────────────────────────────────
const PRODUCTS = [
    { id: 1, name: "Midnight Latte", desc: "Rich espresso with vanilla foam", price: 45, img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", rating: 4.9, category: "hot", featured: true },
    { id: 2, name: "Berry Bliss Bowl", desc: "Açaí, granola & fresh berries", price: 65, img: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400", rating: 4.8, category: "food", featured: true },
    { id: 3, name: "Matcha Cloud", desc: "Ceremonial matcha latte", price: 55, img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400", rating: 4.7, category: "hot", featured: false },
    { id: 4, name: "Tropical Sunset", desc: "Mango, passion fruit & coconut", price: 50, img: "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400", rating: 4.6, category: "cold", featured: true },
    { id: 5, name: "Croissant Royal", desc: "Buttery layers with almond cream", price: 35, img: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=400", rating: 4.9, category: "food", featured: false },
    { id: 6, name: "Iced Caramel Drip", desc: "Cold brew with salted caramel", price: 48, img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", rating: 4.5, category: "cold", featured: false },
    { id: 7, name: "Avocado Toast", desc: "Sourdough, avocado, poached egg", price: 55, img: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400", rating: 4.8, category: "food", featured: true },
    { id: 8, name: "Golden Turmeric", desc: "Turmeric latte with oat milk", price: 42, img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", rating: 4.4, category: "hot", featured: false },
];

const CATEGORIES = [
    { id: "all", name: "All", icon: "✨" },
    { id: "hot", name: "Hot Drinks", icon: "☕" },
    { id: "cold", name: "Cold Drinks", icon: "🧊" },
    { id: "food", name: "Food", icon: "🍽️" },
];

const ACHIEVEMENTS = [
    { emoji: "🏆", label: "First Order", progress: 100 },
    { emoji: "⭐", label: "5 Reviews", progress: 80 },
    { emoji: "🔥", label: "7-Day Streak", progress: 57 },
    { emoji: "💎", label: "VIP Member", progress: 35 },
    { emoji: "🎯", label: "50 Orders", progress: 64 },
];

const ORDER_STEPS = [
    { label: "Order Placed", time: "10:30 AM", done: true },
    { label: "Preparing", time: "10:35 AM", done: true },
    { label: "Ready for Pickup", time: "10:45 AM", done: true },
    { label: "Picked Up", time: "", done: false },
];

// ─── Component ────────────────────────────────────────────────────
const Template1Screen = ({
    displayName, isDarkMode, accent, gradient,
    tagline = "", logoEmoji = "", rating = 4.8,
    isOpen = true, openTime = "9 AM", closeTime = "10 PM",
    showRatings = true, showPrices = true, showFeatured = true,
    bio = "",
    cardStyle = "elevated", navStyle = "default", buttonStyle = "rounded",
}: Template1ScreenProps) => {
    const [currentPage, setCurrentPage] = useState<T1Page>("home");
    const [cart, setCart] = useState<Record<number, number>>({});
    const [favorites, setFavorites] = useState<number[]>([1, 4]);
    const [selectedCat, setSelectedCat] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [liveTime, setLiveTime] = useState("");
    const [batteryLevel] = useState(87);

    // Settings toggles (internal state)
    const [settingDark, setSettingDark] = useState(false);
    const [settingSound, setSettingSound] = useState(true);
    const [settingNotifs, setSettingNotifs] = useState(true);

    // Live clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setLiveTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const bg = isDarkMode ? "bg-slate-950" : "bg-slate-50";
    const cardBg = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/60";
    const textPrimary = isDarkMode ? "text-white" : "text-slate-900";
    const textSecondary = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMuted = isDarkMode ? "text-slate-500" : "text-slate-400";
    const inputBg = isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

    // ─── CARD STYLE HELPER ───
    const getCardClass = () => {
        const base = isDarkMode ? "border-slate-800" : "border-slate-200/60";
        switch (cardStyle) {
            case "elevated": return `${isDarkMode ? "bg-slate-900" : "bg-white"} border ${base} shadow-md`;
            case "flat": return `${isDarkMode ? "bg-slate-900" : "bg-white"} border ${base}`;
            case "outlined": return `bg-transparent border-2 ${isDarkMode ? "border-slate-600" : "border-slate-300"}`;
            case "glass": return `${isDarkMode ? "bg-white/5" : "bg-white/60"} backdrop-blur-md border ${isDarkMode ? "border-white/10" : "border-white/40"}`;
            case "neo": return `${isDarkMode ? "bg-slate-900" : "bg-slate-100"} border-0 ${isDarkMode ? "shadow-[4px_4px_8px_#0a0a0f,-4px_-4px_8px_#1e293b]" : "shadow-[4px_4px_8px_#d1d5db,-4px_-4px_8px_#ffffff]"}`;
            case "brutal": return `${isDarkMode ? "bg-slate-900" : "bg-white"} border-2 ${isDarkMode ? "border-white" : "border-slate-900"} shadow-[3px_3px_0px_0px] ${isDarkMode ? "shadow-white/20" : "shadow-slate-900"}`;
            case "gradient": return `border ${base}`;
            case "minimal": return `bg-transparent border-0`;
            default: return `${isDarkMode ? "bg-slate-900" : "bg-white"} border ${base}`;
        }
    };
    const getCardGradientBg = () => cardStyle === "gradient" ? { background: `linear-gradient(135deg, ${accent}08, ${accent}15)` } : {};

    // ─── BUTTON STYLE HELPER ───
    const getBtnClass = (variant: "primary" | "secondary" = "primary") => {
        const base = "font-bold transition-all";
        if (variant === "secondary") {
            switch (buttonStyle) {
                case "rounded": return `${base} rounded-lg border`;
                case "pill": return `${base} rounded-full border`;
                case "square": return `${base} rounded-none border`;
                case "ghost": return `${base} rounded-lg border-0 bg-transparent`;
                case "gradient": return `${base} rounded-lg border`;
                case "glow": return `${base} rounded-lg border`;
                case "soft": return `${base} rounded-xl border-0`;
                case "bold": return `${base} rounded-lg border-2 uppercase tracking-wider`;
                default: return `${base} rounded-lg border`;
            }
        }
        switch (buttonStyle) {
            case "rounded": return `${base} rounded-lg text-white`;
            case "pill": return `${base} rounded-full text-white`;
            case "square": return `${base} rounded-none text-white`;
            case "ghost": return `${base} rounded-lg text-white border-2 border-white/30`;
            case "gradient": return `${base} rounded-lg text-white`;
            case "glow": return `${base} rounded-lg text-white`;
            case "soft": return `${base} rounded-xl`;
            case "bold": return `${base} rounded-lg text-white uppercase tracking-wider`;
            default: return `${base} rounded-lg text-white`;
        }
    };
    const getBtnStyle = (variant: "primary" | "secondary" = "primary") => {
        if (variant === "secondary") {
            switch (buttonStyle) {
                case "soft": return { background: accent + "15", color: accent };
                case "ghost": return { color: accent };
                default: return { borderColor: accent + "50", color: accent };
            }
        }
        switch (buttonStyle) {
            case "gradient": return { background: gradient };
            case "glow": return { background: accent, boxShadow: `0 0 16px ${accent}50` };
            case "soft": return { background: accent + "20", color: accent };
            default: return { background: accent };
        }
    };

    // Small add-to-cart button
    const getSmallBtnClass = () => {
        switch (buttonStyle) {
            case "pill": return "rounded-full";
            case "square": return "rounded-none";
            case "bold": return "rounded-md";
            default: return "rounded-full";
        }
    };

    const cartCount = useMemo(() => Object.values(cart).reduce((s, c) => s + c, 0), [cart]);
    const cartTotal = useMemo(() => Object.entries(cart).reduce((s, [id, qty]) => {
        const p = PRODUCTS.find(p => p.id === Number(id));
        return s + (p ? p.price * qty : 0);
    }, 0), [cart]);

    const filteredProducts = useMemo(() => {
        let items = selectedCat === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === selectedCat);
        if (searchQuery) items = items.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return items;
    }, [selectedCat, searchQuery]);

    const addToCart = (id: number) => setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    const removeFromCart = (id: number) => setCart(p => { const n = { ...p }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });
    const toggleFav = (id: number) => setFavorites(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    // ─── NAV ITEMS ───
    const navItems: { id: T1Page; icon: typeof Home; label: string }[] = [
        { id: "home", icon: Home, label: "Home" },
        { id: "products", icon: Search, label: "Menu" },
        { id: "cart", icon: ShoppingCart, label: "Cart" },
        { id: "progress", icon: TrendingUp, label: "Orders" },
        { id: "settings", icon: Settings, label: "Settings" },
        { id: "profile", icon: User, label: "Profile" },
    ];

    // ─────────────────────────────── PAGES ──────────────────────────
    const renderPage = () => {
        switch (currentPage) {
            // ══════════════════ HOME ══════════════════
            case "home":
                return (
                    <div className="space-y-3">
                        {/* Hero */}
                        <div className="relative rounded-2xl overflow-hidden" style={{ background: gradient }}>
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                            <div className="relative z-10 p-4 text-white">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-80">Welcome Back</span>
                                </div>
                                <h2 className="text-lg font-black leading-tight mb-1">{displayName}</h2>
                                <p className="text-[11px] opacity-80 mb-3">Discover today's specials & exclusive offers</p>
                                <button
                                    onClick={() => setCurrentPage("products")}
                                    className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-white/30 transition-all"
                                >
                                    Explore Menu <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: PRODUCTS.length, label: "Items", icon: "📦", color: accent },
                                ...(showRatings ? [{ value: rating.toFixed(1), label: "Rating", icon: "⭐", color: "#f59e0b" }] : []),
                                { value: "12", label: "Offers", icon: "🎁", color: "#ef4444" },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl p-2 text-center ${getCardClass()}`} style={getCardGradientBg()}>
                                    <div className="text-sm mb-0.5">{s.icon}</div>
                                    <div className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</div>
                                    <div className={`text-[9px] ${textMuted}`}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Special Offer */}
                        <div className={`rounded-2xl overflow-hidden ${getCardClass()}`} style={getCardGradientBg()}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: accent + "20", background: accent + "08" }}>
                                <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>Today's Special</span>
                                <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">-20%</span>
                            </div>
                            <div className="p-3 flex gap-3">
                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src={PRODUCTS[0].img} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-xs font-bold ${textPrimary}`}>{PRODUCTS[0].name}</h4>
                                    <p className={`text-[10px] ${textSecondary} line-clamp-1`}>{PRODUCTS[0].desc}</p>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <div className="flex items-center gap-1.5">
                                            {showPrices && <span className="text-xs font-extrabold" style={{ color: accent }}>{PRODUCTS[0].price} EGP</span>}
                                            {showPrices && <span className={`text-[10px] line-through ${textMuted}`}>56 EGP</span>}
                                        </div>
                                        <button onClick={() => addToCart(PRODUCTS[0].id)} className={`w-6 h-6 ${getSmallBtnClass()} flex items-center justify-center text-white`} style={{ background: accent }}>
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Featured Products */}
                        {showFeatured && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className={`text-xs font-extrabold ${textPrimary}`}>🔥 Most Popular</h3>
                                    <button onClick={() => setCurrentPage("products")} className="text-[10px] font-bold" style={{ color: accent }}>See All</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                    {PRODUCTS.filter(p => p.featured).map(p => (
                                        <div key={p.id} className={`flex-shrink-0 w-[120px] rounded-xl overflow-hidden ${getCardClass()}`} style={getCardGradientBg()}>
                                            <div className="relative h-20">
                                                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                                                <button onClick={() => toggleFav(p.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                    <Heart className={`w-3 h-3 ${favorites.includes(p.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                                                </button>
                                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ background: gradient }}>
                                                    <Star className="w-2 h-2 fill-white inline mr-0.5" />{p.rating}
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <h4 className={`text-[10px] font-bold line-clamp-1 ${textPrimary}`}>{p.name}</h4>
                                                <div className="flex items-center justify-between mt-1">
                                                    {showPrices && <span className="text-[10px] font-extrabold" style={{ color: accent }}>{p.price} EGP</span>}
                                                    <button onClick={() => addToCart(p.id)} className={`w-5 h-5 ${getSmallBtnClass()} flex items-center justify-center text-white`} style={{ background: accent }}>
                                                        <Plus className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rewards Banner */}
                        <div className="rounded-2xl p-3 border relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)`, borderColor: accent + "20" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + "20" }}>
                                    <Crown className="w-5 h-5" style={{ color: accent }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-bold ${textPrimary}`}>Loyalty Rewards</h4>
                                    <p className={`text-[10px] ${textSecondary}`}>Earn points with every order!</p>
                                </div>
                                <ChevronRight className="w-4 h-4" style={{ color: accent }} />
                            </div>
                            <div className="mt-2">
                                <div className="flex items-center justify-between text-[9px] mb-1">
                                    <span className={textMuted}>350 / 500 points</span>
                                    <span className="font-bold" style={{ color: accent }}>70%</span>
                                </div>
                                <div className={`h-1.5 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                    <div className="h-full rounded-full transition-all" style={{ width: "70%", background: gradient }} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            // ══════════════════ PRODUCTS ══════════════════
            case "products":
                return (
                    <div className="space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search menu..."
                                className={`w-full pl-8 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 ${inputBg}`}
                                style={{ ["--tw-ring-color" as string]: accent }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <X className={`w-3.5 h-3.5 ${textMuted}`} />
                                </button>
                            )}
                        </div>

                        {/* Categories */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                            {CATEGORIES.map(cat => {
                                const active = selectedCat === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCat(cat.id)}
                                        className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold whitespace-nowrap transition-all ${getBtnClass(active ? "primary" : "secondary")} ${active ? "" : textSecondary}`}
                                        style={active ? getBtnStyle("primary") : getBtnStyle("secondary")}
                                    >
                                        <span className="text-xs">{cat.icon}</span>
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Count & Sort */}
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold ${textSecondary}`}>{filteredProducts.length} items</span>
                            <div className="flex items-center gap-1">
                                <span className={`text-[10px] ${textMuted}`}>Sort by</span>
                                <span className="text-[10px] font-bold" style={{ color: accent }}>Popular</span>
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="space-y-2">
                            {filteredProducts.map((p, idx) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                                    className={`rounded-xl overflow-hidden ${getCardClass()}`}
                                    style={getCardGradientBg()}
                                >
                                    <div className="flex gap-2.5 p-2.5">
                                        <div className="relative w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0 group">
                                            <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                            {p.featured && (
                                                <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[7px] font-bold text-white" style={{ background: gradient }}>HOT</div>
                                            )}
                                            <button onClick={() => toggleFav(p.id)} className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                <Heart className={`w-2.5 h-2.5 ${favorites.includes(p.id) ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1 mb-0.5">
                                                <h3 className={`text-xs font-bold leading-tight ${textPrimary}`}>{p.name}</h3>
                                                {showPrices && <span className="text-xs font-extrabold whitespace-nowrap" style={{ color: accent }}>{p.price} EGP</span>}
                                            </div>
                                            <p className={`text-[10px] line-clamp-1 mb-1.5 ${textSecondary}`}>{p.desc}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {showRatings && (
                                                        <div className="flex items-center gap-0.5">
                                                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                                            <span className={`text-[10px] font-bold ${textPrimary}`}>{p.rating}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-0.5">
                                                        <Clock className={`w-2.5 h-2.5 ${textMuted}`} />
                                                        <span className={`text-[10px] ${textMuted}`}>15 min</span>
                                                    </div>
                                                </div>
                                                {/* Add To Cart */}
                                                {(cart[p.id] || 0) > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => removeFromCart(p.id)} className={`w-6 h-6 ${getSmallBtnClass()} border flex items-center justify-center`} style={{ borderColor: accent + "50", color: accent }}>
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className={`text-[10px] font-bold w-4 text-center ${textPrimary}`}>{cart[p.id]}</span>
                                                        <button onClick={() => addToCart(p.id)} className={`w-6 h-6 ${getSmallBtnClass()} flex items-center justify-center text-white`} style={{ background: accent }}>
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => addToCart(p.id)} className={`flex items-center gap-1 px-2.5 py-1 text-[10px] ${getBtnClass("primary")}`} style={getBtnStyle("primary")}>
                                                        <Plus className="w-3 h-3" /> Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-6">
                                <Search className={`w-10 h-10 mx-auto mb-2 ${textMuted}`} />
                                <p className={`text-xs ${textSecondary}`}>No items found</p>
                            </div>
                        )}
                    </div>
                );

            // ══════════════════ CART ══════════════════
            case "cart":
                return (
                    <div className="space-y-3">
                        {cartCount > 0 ? (
                            <>
                                {/* Cart Header */}
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-sm font-extrabold ${textPrimary}`}>Your Cart ({cartCount})</h3>
                                    <button onClick={() => setCart({})} className="text-[10px] text-red-500 font-bold">Clear All</button>
                                </div>

                                {/* Cart Items */}
                                <div className={`rounded-xl ${getCardClass()} divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`} style={getCardGradientBg()}>
                                    {Object.entries(cart).map(([id, qty]) => {
                                        const p = PRODUCTS.find(p => p.id === Number(id));
                                        if (!p) return null;
                                        return (
                                            <div key={id} className="flex items-center gap-2.5 p-2.5">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-xs font-bold ${textPrimary}`}>{p.name}</h4>
                                                    <p className="text-[10px] font-bold" style={{ color: accent }}>{p.price} EGP × {qty}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => removeFromCart(p.id)} className={`w-6 h-6 ${getSmallBtnClass()} border flex items-center justify-center`} style={{ borderColor: accent + "40", color: accent }}>
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className={`text-[10px] font-bold w-4 text-center ${textPrimary}`}>{qty}</span>
                                                    <button onClick={() => addToCart(p.id)} className={`w-6 h-6 ${getSmallBtnClass()} flex items-center justify-center text-white`} style={{ background: accent }}>
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Promo Code */}
                                <div className={`rounded-xl p-2.5 flex gap-2 ${getCardClass()}`} style={getCardGradientBg()}>
                                    <input placeholder="Promo code" className={`flex-1 px-2.5 py-1.5 rounded-lg border text-[10px] focus:outline-none ${inputBg}`} />
                                    <button className={`px-3 py-1.5 text-[10px] ${getBtnClass("primary")}`} style={getBtnStyle("primary")}>Apply</button>
                                </div>

                                {/* Order Summary */}
                                <div className={`rounded-xl p-3 space-y-2 ${getCardClass()}`} style={getCardGradientBg()}>
                                    <h4 className={`text-xs font-bold ${textPrimary} mb-2`}>Order Summary</h4>
                                    <div className="flex justify-between text-[10px]">
                                        <span className={textSecondary}>Subtotal</span>
                                        <span className={`font-bold ${textPrimary}`}>{cartTotal} EGP</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className={textSecondary}>Delivery Fee</span>
                                        <span className="text-green-500 font-bold">Free</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className={textSecondary}>Discount</span>
                                        <span className="text-red-500 font-bold">-0 EGP</span>
                                    </div>
                                    <div className={`flex justify-between text-sm font-extrabold pt-2 border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                                        <span className={textPrimary}>Total</span>
                                        <span style={{ color: accent }}>{cartTotal} EGP</span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <button className={`w-full py-3 text-sm flex items-center justify-center gap-2 shadow-lg ${getBtnClass("primary")}`} style={getBtnStyle("primary")}>
                                    <CreditCard className="w-4 h-4" />
                                    Checkout — {cartTotal} EGP
                                </button>

                                {/* Delivery Info */}
                                <div className={`rounded-xl p-2.5 flex items-center gap-2.5 ${getCardClass()}`} style={getCardGradientBg()}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + "15" }}>
                                        <Truck className="w-4 h-4" style={{ color: accent }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-[10px] font-bold ${textPrimary}`}>Free Delivery</p>
                                        <p className={`text-[9px] ${textMuted}`}>Estimated 25-35 min</p>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 ${textMuted}`} />
                                </div>

                                {/* Continue Shopping */}
                                <button onClick={() => setCurrentPage("products")} className={`w-full py-2 text-[10px] flex items-center justify-center gap-1 ${getBtnClass("secondary")}`} style={getBtnStyle("secondary")}>
                                    <ArrowRight className="w-3 h-3 rotate-180" /> Continue Shopping
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: accent + "10" }}>
                                    <ShoppingCart className="w-8 h-8" style={{ color: accent + "60" }} />
                                </div>
                                <h3 className={`text-sm font-bold mb-1 ${textPrimary}`}>Cart is Empty</h3>
                                <p className={`text-[10px] mb-3 ${textSecondary}`}>Add items from the menu to get started</p>
                                <button onClick={() => setCurrentPage("products")} className={`px-4 py-2 text-xs ${getBtnClass("primary")}`} style={getBtnStyle("primary")}>
                                    Browse Menu
                                </button>
                            </div>
                        )}
                    </div>
                );

            // ══════════════════ SETTINGS ══════════════════
            case "settings":
                return (
                    <div className="space-y-3">
                        <h3 className={`text-sm font-extrabold ${textPrimary}`}>Settings</h3>

                        {/* Account Section */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            <div className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? "#1e293b" : "#f1f5f9" }}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Account</span>
                            </div>
                            {[
                                { icon: User, label: "Edit Profile", sub: "Name, photo, bio", color: accent, page: "profile" as T1Page },
                                { icon: MapPin, label: "Addresses", sub: "Manage delivery addresses", color: "#3b82f6" },
                                { icon: CreditCard, label: "Payment Methods", sub: "Cards & wallets", color: "#8b5cf6" },
                                { icon: Bell, label: "Notifications", sub: "Push, email, SMS", color: "#f59e0b" },
                            ].map(({ icon: Icon, label, sub, color, page }) => (
                                <div
                                    key={label}
                                    onClick={() => page && setCurrentPage(page)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"} ${page ? "cursor-pointer hover:opacity-80" : ""}`}
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
                                        <Icon className="w-4 h-4" style={{ color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold ${textPrimary}`}>{label}</p>
                                        <p className={`text-[9px] ${textMuted}`}>{sub}</p>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 ${textMuted}`} />
                                </div>
                            ))}
                        </div>

                        {/* Preferences - WORKING TOGGLES */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            <div className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? "#1e293b" : "#f1f5f9" }}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Preferences</span>
                            </div>
                            {[
                                { icon: Moon, label: "Dark Mode", active: settingDark, onToggle: () => setSettingDark(!settingDark), color: "#6366f1" },
                                { icon: Globe, label: "Language", value: "English", color: "#06b6d4" },
                                { icon: Bell, label: "Notifications", active: settingNotifs, onToggle: () => setSettingNotifs(!settingNotifs), color: "#f43f5e" },
                                { icon: Eye, label: "Sound Effects", active: settingSound, onToggle: () => setSettingSound(!settingSound), color: "#10b981" },
                            ].map(({ icon: Icon, label, active, onToggle, value, color }) => (
                                <div
                                    key={label}
                                    onClick={onToggle}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"} ${onToggle ? "cursor-pointer" : ""}`}
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
                                        <Icon className="w-4 h-4" style={{ color }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold ${textPrimary}`}>{label}</p>
                                    </div>
                                    {onToggle ? (
                                        <div className={`w-9 h-5 rounded-full relative transition-colors ${active ? "" : isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} style={active ? { background: accent } : {}}>
                                            <motion.div
                                                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                                                animate={{ left: active ? 18 : 2 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </div>
                                    ) : (
                                        <span className={`text-[10px] font-bold ${textSecondary}`}>{value}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Support */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            <div className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? "#1e293b" : "#f1f5f9" }}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Support</span>
                            </div>
                            {[
                                { icon: HelpCircle, label: "Help Center", color: "#10b981" },
                                { icon: Shield, label: "Privacy Policy", color: "#6366f1" },
                                { icon: Award, label: "Rate Us", color: "#f59e0b" },
                            ].map(({ icon: Icon, label, color }) => (
                                <div key={label} className={`flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
                                        <Icon className="w-4 h-4" style={{ color }} />
                                    </div>
                                    <span className={`text-xs font-bold flex-1 ${textPrimary}`}>{label}</span>
                                    <ChevronRight className={`w-3.5 h-3.5 ${textMuted}`} />
                                </div>
                            ))}
                        </div>

                        {/* Version */}
                        <div className="text-center py-2">
                            <p className={`text-[9px] ${textMuted}`}>App Version 2.4.1</p>
                        </div>
                    </div>
                );

            // ══════════════════ PROGRESS ══════════════════
            case "progress":
                return (
                    <div className="space-y-3">
                        <h3 className={`text-sm font-extrabold ${textPrimary}`}>Orders & Progress</h3>

                        {/* Active Order Tracking */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            <div className="px-3 py-2 flex items-center justify-between" style={{ background: accent + "08", borderBottom: `1px solid ${accent}15` }}>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold" style={{ color: accent }}>Active Order #1247</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}>In Progress</span>
                            </div>
                            <div className="p-3">
                                {/* Timeline */}
                                <div className="space-y-0">
                                    {ORDER_STEPS.map((step, idx) => (
                                        <div key={step.label} className="flex gap-2.5">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "text-white" : `border-2 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}`} style={step.done ? { background: accent } : {}}>
                                                    {step.done && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                {idx < ORDER_STEPS.length - 1 && (
                                                    <div className={`w-0.5 h-6 ${step.done ? "" : isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} style={step.done ? { background: accent + "40" } : {}} />
                                                )}
                                            </div>
                                            <div className="pb-2">
                                                <p className={`text-[10px] font-bold leading-[20px] ${step.done ? textPrimary : textMuted}`}>{step.label}</p>
                                                {step.time && <p className={`text-[9px] ${textMuted}`}>{step.time}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Weekly Stats */}
                        <div className={`rounded-xl ${getCardClass()} p-3`} style={getCardGradientBg()}>
                            <h4 className={`text-xs font-bold mb-2 ${textPrimary}`}>📊 This Week</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: "Orders", value: "12", icon: Package, color: accent },
                                    { label: "Spent", value: "580 EGP", icon: CreditCard, color: "#8b5cf6" },
                                    { label: "Saved", value: "120 EGP", icon: Gift, color: "#10b981" },
                                    { label: "Points", value: "350", icon: Zap, color: "#f59e0b" },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label} className={`rounded-lg p-2.5 ${isDarkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                                        <Icon className="w-3.5 h-3.5 mb-1" style={{ color }} />
                                        <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
                                        <div className={`text-[9px] ${textMuted}`}>{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Achievements Progress */}
                        <div className={`rounded-xl ${getCardClass()} p-3`} style={getCardGradientBg()}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className={`text-xs font-bold ${textPrimary}`}>🏆 Achievements</h4>
                                <span className={`text-[9px] ${textMuted}`}>{ACHIEVEMENTS.filter(a => a.progress === 100).length}/{ACHIEVEMENTS.length}</span>
                            </div>
                            <div className="space-y-2">
                                {ACHIEVEMENTS.map(a => (
                                    <div key={a.label} className="flex items-center gap-2">
                                        <span className="text-sm">{a.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-[10px] font-bold ${textPrimary}`}>{a.label}</span>
                                                <span className={`text-[9px] font-bold ${a.progress === 100 ? "text-green-500" : textMuted}`}>{a.progress}%</span>
                                            </div>
                                            <div className={`h-1.5 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${a.progress}%`, background: a.progress === 100 ? "#10b981" : gradient }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            <div className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? "#1e293b" : "#f1f5f9" }}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Recent Orders</span>
                            </div>
                            {[
                                { id: "#1246", items: "Matcha Cloud, Croissant", total: "90 EGP", status: "Delivered", color: "#10b981" },
                                { id: "#1245", items: "Berry Bliss Bowl", total: "65 EGP", status: "Delivered", color: "#10b981" },
                                { id: "#1244", items: "Midnight Latte x2", total: "90 EGP", status: "Cancelled", color: "#ef4444" },
                            ].map(order => (
                                <div key={order.id} className={`flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: order.color + "15" }}>
                                        <Package className="w-4 h-4" style={{ color: order.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[10px] font-bold ${textPrimary}`}>{order.id}</p>
                                        <p className={`text-[9px] ${textMuted} line-clamp-1`}>{order.items}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-0.5">
                                        <p className="text-[10px] font-bold" style={{ color: accent }}>{order.total}</p>
                                        <p className="text-[8px] font-bold" style={{ color: order.color }}>{order.status}</p>
                                        {order.status === "Delivered" && (
                                            <button onClick={() => setCurrentPage("products")} className="text-[8px] font-bold" style={{ color: accent }}>Reorder</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Again CTA */}
                        <button onClick={() => setCurrentPage("products")} className={`w-full py-2.5 text-xs flex items-center justify-center gap-1.5 ${getBtnClass("primary")}`} style={getBtnStyle("primary")}>
                            <Coffee className="w-3.5 h-3.5" /> Order Again
                        </button>
                    </div>
                );

            // ══════════════════ PROFILE ══════════════════
            case "profile":
                return (
                    <div className="space-y-3">
                        {/* Profile Header */}
                        <div className="relative rounded-2xl overflow-hidden text-white" style={{ background: gradient }}>
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                            <div className="relative z-10 p-4 flex flex-col items-center text-center">
                                <div className="relative mb-2">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <button className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <Camera className="w-3 h-3" style={{ color: accent }} />
                                    </button>
                                </div>
                                <h3 className="text-sm font-extrabold">{displayName}</h3>
                                <p className="text-[10px] opacity-80">{bio || "Premium Member since 2024"}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Crown className="w-3 h-3 text-yellow-300" />
                                    <span className="text-[9px] font-bold text-yellow-200">Gold Tier</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: "47", label: "Orders", color: accent },
                                { value: rating.toFixed(1), label: "Rating", color: "#f59e0b" },
                                { value: favorites.length.toString(), label: "Favorites", color: "#ef4444" },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl p-2.5 text-center ${getCardClass()}`} style={getCardGradientBg()}>
                                    <div className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</div>
                                    <div className={`text-[9px] ${textMuted}`}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Membership Card */}
                        <div className="rounded-xl p-3 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)`, border: `1px solid ${accent}20` }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accent + "20" }}>
                                    <Zap className="w-4 h-4" style={{ color: accent }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-bold ${textPrimary}`}>350 Points</h4>
                                    <p className={`text-[9px] ${textMuted}`}>150 more for Platinum</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent + "15", color: accent }}>70%</span>
                            </div>
                            <div className={`h-1.5 rounded-full mt-2 ${isDarkMode ? "bg-slate-800" : "bg-slate-200/50"}`}>
                                <div className="h-full rounded-full" style={{ width: "70%", background: gradient }} />
                            </div>
                        </div>

                        {/* Menu Options */}
                        <div className={`rounded-xl ${getCardClass()} overflow-hidden`} style={getCardGradientBg()}>
                            {[
                                { icon: Heart, label: `Favorites (${favorites.length})`, color: "#ef4444" },
                                { icon: Package, label: "Order History", color: accent, page: "progress" as T1Page },
                                { icon: MapPin, label: "Saved Addresses", color: "#3b82f6" },
                                { icon: CreditCard, label: "Payment Methods", color: "#8b5cf6" },
                                { icon: Gift, label: "Refer a Friend", color: "#10b981" },
                                { icon: Edit3, label: "Edit Profile", color: "#f59e0b" },
                                { icon: Settings, label: "Settings", color: "#6366f1", page: "settings" as T1Page },
                            ].map(({ icon: Icon, label, color, page }) => (
                                <div
                                    key={label}
                                    onClick={() => page && setCurrentPage(page)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 border-b last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"} ${page ? "cursor-pointer hover:opacity-80" : ""}`}
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "12" }}>
                                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                                    </div>
                                    <span className={`text-xs font-bold flex-1 ${textPrimary}`}>{label}</span>
                                    <ChevronRight className={`w-3.5 h-3.5 ${textMuted}`} />
                                </div>
                            ))}
                        </div>

                        {/* Logout */}
                        <button className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold ${isDarkMode ? "border-red-500/30 text-red-400" : "border-red-200 text-red-500"}`}>
                            <LogOut className="w-3.5 h-3.5" />
                            Log Out
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    // ─── RENDER ─────────────────────────────────────────────────────
    return (
        <div className={`absolute inset-0 z-[90] flex flex-col ${bg}`}>
            {/* ── Live Status Bar ── */}
            <div className={`flex-shrink-0 px-5 py-[5px] flex items-center justify-between ${isDarkMode ? "bg-black" : "bg-slate-900"}`}>
                <span className="text-[10px] font-semibold text-white tracking-wide">{liveTime}</span>
                <div className="absolute left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-black rounded-b-2xl" />
                <div className="flex items-center gap-[6px]">
                    <Signal className="w-[11px] h-[11px] text-white" />
                    <Wifi className="w-[11px] h-[11px] text-white" />
                    <div className="flex items-center gap-[2px]">
                        <div className="relative w-[18px] h-[9px] rounded-[2px] border border-white/70 p-[1px]">
                            <div className="h-full rounded-[1px] bg-white" style={{ width: `${batteryLevel}%` }} />
                            <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] rounded-r-sm bg-white/70" />
                        </div>
                        <span className="text-[8px] font-medium text-white/80 ml-[1px]">{batteryLevel}</span>
                    </div>
                </div>
            </div>

            {/* ── App Header ── */}
            <div className={`flex-shrink-0 px-3 py-2 flex items-center justify-between border-b ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {logoEmoji && (
                        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-base" style={{ background: accent + "15" }}>
                            {logoEmoji}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        {tagline && <p className={`text-[8px] uppercase tracking-[0.15em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{tagline}</p>}
                        <p className={`text-xs font-bold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{displayName}</p>
                        {showRatings && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                <span className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{rating.toFixed(1)}</span>
                                <span className={`text-[9px] font-medium ${isOpen ? "text-emerald-500" : isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    · {isOpen ? `Open · ${openTime}–${closeTime}` : "Closed"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button className="relative p-1.5 rounded-lg">
                        <Bell className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-bold text-white">3</span>
                    </button>
                    <button onClick={() => setCurrentPage("cart")} className="relative p-1.5 rounded-lg">
                        <ShoppingCart className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                        {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-bold text-white">{cartCount}</span>}
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                <div className="p-3">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPage}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderPage()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Bottom Navigation ── */}
            {(() => {
                const navWrapperClass = (() => {
                    const base = "flex-shrink-0 flex items-center justify-around";
                    switch (navStyle) {
                        case "floating": return `${base} mx-2 mb-1.5 rounded-2xl shadow-xl border ${isDarkMode ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-slate-200"} backdrop-blur-lg px-1 py-1`;
                        case "glass": return `${base} border-t ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white/60 border-white/30"} backdrop-blur-xl px-1 py-1`;
                        case "minimal": return `${base} ${isDarkMode ? "bg-transparent" : "bg-transparent"} px-1 py-1`;
                        case "block": return `${base} border-t ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} px-0 py-0`;
                        case "tab": return `${base} ${isDarkMode ? "bg-slate-900" : "bg-white"} px-1 py-1`;
                        default: return `${base} border-t px-1 py-1 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`;
                    }
                })();

                return (
                    <div className={navWrapperClass}>
                        {navItems.map(({ id, icon: Icon, label }) => {
                            const active = currentPage === id;
                            const badge = id === "cart" && cartCount > 0;

                            const renderIndicator = () => {
                                if (!active) return null;
                                switch (navStyle) {
                                    case "pill": return <motion.div layoutId="t1-nav-ind" className="absolute inset-0 rounded-full" style={{ background: accent + "15" }} />;
                                    case "dots": return <motion.div layoutId="t1-nav-ind" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: accent }} />;
                                    case "block": return <motion.div layoutId="t1-nav-ind" className="absolute inset-0" style={{ background: accent + "10" }} />;
                                    case "tab": return <motion.div layoutId="t1-nav-ind" className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: accent }} />;
                                    case "glass": return <motion.div layoutId="t1-nav-ind" className="absolute inset-0 rounded-lg" style={{ background: accent + "12" }} />;
                                    case "floating": return <motion.div layoutId="t1-nav-ind" className="absolute inset-0 rounded-xl" style={{ background: accent + "15" }} />;
                                    case "minimal": return null;
                                    default: return <motion.div layoutId="t1-nav-ind" className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: accent }} />;
                                }
                            };

                            return (
                                <button
                                    key={id}
                                    onClick={() => setCurrentPage(id)}
                                    className={`relative flex flex-col items-center gap-0.5 py-1 ${navStyle === "block" ? "flex-1 py-2" : "px-1.5"} rounded-lg transition-all`}
                                    style={active ? { color: accent } : {}}
                                >
                                    {renderIndicator()}
                                    <div className="relative z-10">
                                        <Icon className={`w-4 h-4 ${active ? "" : isDarkMode ? "text-slate-500" : "text-slate-400"}`} style={active ? { color: accent } : {}} />
                                        {badge && (
                                            <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">{cartCount}</span>
                                        )}
                                    </div>
                                    <span className={`relative z-10 text-[8px] font-bold ${active ? "" : isDarkMode ? "text-slate-500" : "text-slate-400"}`} style={active ? { color: accent } : {}}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
};

export default Template1Screen;
