/**
 * WebSiteTemplate — Category 2: Mobile Website Preview
 *
 * Radically different from all App-category templates (Standard, Modern, Retro).
 *
 * KEY DIFFERENCES vs every App template:
 * · No phone status bar           → browser URL bar + macOS-style dots
 * · No bottom navigation bar      → sticky top web-nav with hamburger
 * · No page-routing shell         → scrollable ONE-PAGE sections (home)
 *   or standalone section pages (menu/cart/about)
 * · Cards: landscape image-left   → wide web-style cards, not narrow app cards
 * · Typography: h1/h2 sections    → editorial headings, not app labels
 * · Buttons: full-width CTA       → ghost + solid web buttons
 */

import React, { useState } from "react";
import {
    Search, ShoppingCart, Heart, Star, Plus, Globe,
    X, Menu as MenuIcon, ArrowRight, MapPin, Clock,
    Share2, ChevronRight, Minus, Check,
} from "lucide-react";
import type { MenuItem } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type WSPage = "home" | "menu" | "cart" | "about";

interface CategoryItem {
    id: string;
    name: string;
    icon: React.ReactNode;
}

interface StatsData {
    totalItems: number;
    featuredCount: number;
    averagePrice: number;
    totalValue: number;
}

export interface WebSiteTemplateProps {
    displayName: string;
    serviceType: string;
    accent: string;
    gradient: string;
    isDarkMode: boolean;
    filteredItems: MenuItem[];
    categories: CategoryItem[];
    stats: StatsData;
    showRatings: boolean;
    showFeatured: boolean;
    showPrices: boolean;
    addToCart: (itemId: number) => void;
    clearCart: () => void;
    setSelectedImage: (img: string | null) => void;
    isPreviewVisible: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    selectedCategory: string;
    setSelectedCategory: (c: string) => void;
    cartCount: number;
    favorites: number[];
    setFavorites: (f: number[] | ((prev: number[]) => number[])) => void;
    rating: number;
    isOpen: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WebSiteTemplate: React.FC<WebSiteTemplateProps> = ({
    displayName, serviceType, accent, gradient, isDarkMode,
    filteredItems, categories, stats,
    showRatings, showFeatured, showPrices,
    addToCart, clearCart, setSelectedImage, isPreviewVisible,
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    cartCount, favorites, setFavorites,
    rating, isOpen,
}) => {
    const [wsPage, setWsPage] = useState<WSPage>("home");
    const [menuOpen, setMenuOpen] = useState(false);

    /* ── theme tokens ── */
    const bg        = isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-slate-50 text-zinc-900";
    const navBg     = isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100";
    const cardBg    = isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100";
    const muted     = isDarkMode ? "text-zinc-400" : "text-slate-400";
    const divider   = isDarkMode ? "border-zinc-800" : "border-slate-100";
    const input     = isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-zinc-900 placeholder:text-slate-400";

    const serviceLabel =
        serviceType === "restaurant" ? "مطعم"
        : serviceType === "cafe"       ? "مقهى"
        : serviceType === "salon"      ? "صالون"
        : "متجر";

    const featuredItems = filteredItems.filter(i => i.featured);
    const cartTotal     = filteredItems.slice(0, cartCount).reduce((s, i) => s + parseFloat(i.price), 0);

    function toggleFav(id: number) {
        setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    const NAV_PAGES: { id: WSPage; label: string }[] = [
        { id: "home",  label: "Home" },
        { id: "menu",  label: "Menu" },
        { id: "cart",  label: "Cart" },
        { id: "about", label: "About" },
    ];

    return (
        <div className={`flex flex-col h-full ${bg} overflow-hidden`}>

            {/* ══ Browser Chrome ══════════════════════════════════════════ */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 flex-shrink-0 ${isDarkMode ? "bg-zinc-800" : "bg-slate-200"}`}>
                {/* macOS dots */}
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400/70" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400/70" />
                    <div className="w-2 h-2 rounded-full bg-green-400/70" />
                </div>
                {/* URL bar */}
                <div className={`flex-1 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] ${isDarkMode ? "bg-zinc-700 text-zinc-300" : "bg-white text-slate-500"}`}>
                    <Globe className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                    <span className="truncate">{displayName.toLowerCase().replace(/\s+/g, "")}.com</span>
                </div>
                <Share2 className={`w-3 h-3 flex-shrink-0 ${muted}`} />
            </div>

            {/* ══ Sticky Top Nav ══════════════════════════════════════════ */}
            <div
                className={`px-3 py-2 border-b flex items-center justify-between flex-shrink-0 ${navBg}`}
                style={{ borderBottomColor: `${accent}25` }}
            >
                <button
                    onClick={() => setMenuOpen(v => !v)}
                    className={`p-1 rounded transition-colors ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
                    aria-label="Menu"
                >
                    {menuOpen ? <X size={16} /> : <MenuIcon size={16} />}
                </button>

                {/* Brand */}
                <button onClick={() => { setWsPage("home"); setMenuOpen(false); }} className="font-black text-[13px] leading-none">
                    {displayName || "Your Brand"}
                </button>

                {/* Cart */}
                <button
                    className="relative p-1"
                    onClick={() => { setWsPage("cart"); setMenuOpen(false); }}
                    aria-label={`Cart — ${cartCount} items`}
                >
                    <ShoppingCart size={16} />
                    {cartCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[8px] flex items-center justify-center font-black shadow"
                            style={{ background: accent }}
                        >
                            {cartCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ══ Hamburger Dropdown ══════════════════════════════════════ */}
            {menuOpen && (
                <div className={`border-b flex-shrink-0 ${navBg} ${divider}`}>
                    {NAV_PAGES.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => { setWsPage(id); setMenuOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors border-b last:border-none ${divider} ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-50"}`}
                            style={{ color: wsPage === id ? accent : undefined }}
                        >
                            <span>{label}</span>
                            {wsPage === id && <Check size={11} style={{ color: accent }} />}
                        </button>
                    ))}
                </div>
            )}

            {/* ══ Content ═════════════════════════════════════════════════ */}
            {!isPreviewVisible ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className={`text-xs ${muted}`}>Enter a business name to preview</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

                    {/* ── HOME PAGE ───────────────────────────────────────── */}
                    {wsPage === "home" && (
                        <div className="animate-fade-in">

                            {/* Hero — full-bleed gradient banner */}
                            <div className="relative overflow-hidden" style={{ background: gradient, minHeight: 148 }}>
                                {/* Decorative blobs */}
                                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/[0.08]" />
                                <div className="absolute -left-4 -bottom-6 w-20 h-20 rounded-full bg-white/[0.06]" />

                                <div className="relative z-10 px-5 py-7 text-white">
                                    <div className="text-[8px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">
                                        {serviceLabel}
                                    </div>
                                    <h1 className="text-[22px] font-black leading-none mb-1">
                                        {displayName || "Your Business"}
                                    </h1>
                                    <div className="flex items-center gap-2 text-[10px] opacity-85 mb-4">
                                        <div className="flex items-center gap-0.5">
                                            <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                                            <span className="font-bold">{rating.toFixed(1)}</span>
                                        </div>
                                        <span className="opacity-50">·</span>
                                        <span className={`font-semibold ${isOpen ? "text-emerald-300" : "text-red-300"}`}>
                                            {isOpen ? "Open Now" : "Closed"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setWsPage("menu")}
                                            className="bg-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 active:scale-95 transition-transform"
                                            style={{ color: accent }}
                                        >
                                            Explore Menu <ArrowRight size={10} />
                                        </button>
                                        <button
                                            onClick={() => setWsPage("about")}
                                            className="border border-white/40 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/10 transition"
                                        >
                                            About Us
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stats row — horizontal strip */}
                            <div className={`grid grid-cols-3 border-b ${divider}`}>
                                {[
                                    { v: stats.totalItems, l: "Items" },
                                    { v: rating.toFixed(1), l: "Rating" },
                                    { v: stats.featuredCount, l: "Featured" },
                                ].map((s, i) => (
                                    <div
                                        key={s.l}
                                        className="py-3 text-center"
                                        style={{ borderRight: i < 2 ? `1px solid ${isDarkMode ? "#27272a" : "#f1f5f9"}` : undefined }}
                                    >
                                        <div className="text-xl font-black" style={{ color: accent }}>{s.v}</div>
                                        <div className={`text-[8px] uppercase tracking-[0.2em] mt-0.5 font-bold ${muted}`}>{s.l}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Menu Highlights */}
                            {featuredItems.length > 0 && (
                                <div className="px-4 py-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-sm font-black">Menu Highlights</h2>
                                        <button
                                            onClick={() => setWsPage("menu")}
                                            className="text-[10px] font-bold flex items-center gap-0.5"
                                            style={{ color: accent }}
                                        >
                                            See all <ChevronRight size={10} />
                                        </button>
                                    </div>

                                    {/* Horizontal snap scroll cards */}
                                    <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                                        {featuredItems.slice(0, 4).map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex-shrink-0 w-36 rounded-2xl overflow-hidden border shadow-sm ${cardBg}`}
                                            >
                                                <div
                                                    className="h-24 cursor-pointer overflow-hidden"
                                                    onClick={() => setSelectedImage(item.image)}
                                                >
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                </div>
                                                <div className="p-2">
                                                    <h3 className="font-bold text-[11px] leading-tight truncate">{item.name}</h3>
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        {showPrices && (
                                                            <span className="font-black text-[11px]" style={{ color: accent }}>
                                                                {item.price} EGP
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => addToCart(item.id)}
                                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"
                                                            style={{ background: accent }}
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CTA Banner */}
                            <div
                                className="mx-4 mb-4 rounded-2xl p-4 text-white text-center"
                                style={{ background: gradient }}
                            >
                                <p className="text-xs font-black mb-2">Ready to order?</p>
                                <button
                                    onClick={() => setWsPage("menu")}
                                    className="bg-white text-[10px] font-black px-5 py-1.5 rounded-full shadow active:scale-95 transition-transform"
                                    style={{ color: accent }}
                                >
                                    View Full Menu →
                                </button>
                            </div>

                            {/* Footer */}
                            <div className={`px-4 py-3 border-t text-center ${divider}`}>
                                <p className={`text-[9px] ${muted}`}>
                                    © {displayName} · All rights reserved
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── MENU PAGE ───────────────────────────────────────── */}
                    {wsPage === "menu" && (
                        <div className="animate-fade-in">

                            {/* Page header */}
                            <div className={`px-4 pt-4 pb-3 border-b ${divider}`}>
                                <h1 className="text-base font-black mb-3">Our Menu</h1>
                                {/* Search */}
                                <div className="relative">
                                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search dishes..."
                                        className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none transition-colors ${input}`}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <X className={`w-3.5 h-3.5 ${muted}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category tabs — scrollable */}
                            <div
                                className={`px-4 py-2 flex gap-1.5 overflow-x-auto border-b ${divider}`}
                                style={{ scrollbarWidth: "none" }}
                            >
                                {categories.map(cat => {
                                    const isActive = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0 border active:scale-95"
                                            style={isActive
                                                ? { background: accent, borderColor: accent, color: "#fff" }
                                                : { background: isDarkMode ? "#27272a" : "#f8fafc", borderColor: isDarkMode ? "#3f3f46" : "#e2e8f0", color: isDarkMode ? "#a1a1aa" : "#64748b" }
                                            }
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Item grid — 2-col web cards */}
                            {filteredItems.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Search className={`w-8 h-8 mx-auto mb-2 opacity-20 ${muted}`} />
                                    <p className={`text-xs ${muted}`}>No items found</p>
                                </div>
                            ) : (
                                <div className="p-3 grid grid-cols-2 gap-2.5">
                                    {filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`rounded-2xl overflow-hidden border shadow-sm ${cardBg}`}
                                        >
                                            {/* Image */}
                                            <div
                                                className="relative aspect-[4/3] cursor-pointer overflow-hidden"
                                                onClick={() => setSelectedImage(item.image)}
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                />
                                                {/* Featured badge */}
                                                {item.featured && showFeatured && (
                                                    <div
                                                        className="absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[7px] font-black text-white backdrop-blur-sm flex items-center gap-0.5 shadow-sm"
                                                        style={{ background: accent }}
                                                    >
                                                        <Star size={8} className="fill-white" /> Top Pick
                                                    </div>
                                                )}
                                                {/* Fav button */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/75 backdrop-blur-sm flex items-center justify-center shadow"
                                                >
                                                    <Heart
                                                        size={11}
                                                        className={favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-slate-400"}
                                                    />
                                                </button>
                                            </div>

                                            {/* Text */}
                                            <div className="p-2.5">
                                                <h3 className="font-bold text-[11px] leading-tight truncate">{item.name}</h3>
                                                <p className={`text-[9px] mt-0.5 line-clamp-1 ${muted}`}>{item.description}</p>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div>
                                                        {showPrices && (
                                                            <span className="font-black text-xs" style={{ color: accent }}>
                                                                {item.price} EGP
                                                            </span>
                                                        )}
                                                        {item.rating && showRatings && (
                                                            <div className={`flex items-center gap-0.5 text-[9px] mt-0.5 ${muted}`}>
                                                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                                <span>{item.rating}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => addToCart(item.id)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                                                        style={{ background: accent }}
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CART PAGE ───────────────────────────────────────── */}
                    {wsPage === "cart" && (
                        <div className="p-4 animate-fade-in">
                            <h1 className="text-base font-black mb-4">Your Order</h1>

                            {cartCount > 0 ? (
                                <>
                                    {/* Cart items */}
                                    <div className="space-y-2 mb-4">
                                        {filteredItems.slice(0, cartCount).map(item => (
                                            <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${cardBg}`}>
                                                <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-xs truncate">{item.name}</h4>
                                                    {showPrices && (
                                                        <p className="text-[10px] font-bold mt-0.5" style={{ color: accent }}>
                                                            {item.price} EGP
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? "bg-zinc-700 text-zinc-300" : "bg-slate-100 text-slate-500"}`}>
                                                        ×{1}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order summary card */}
                                    <div className={`rounded-2xl p-4 border ${isDarkMode ? "bg-zinc-800/60 border-zinc-700" : "bg-slate-50 border-slate-100"}`}>
                                        <div className="flex justify-between text-[10px] mb-1">
                                            <span className={muted}>Subtotal ({cartCount} items)</span>
                                            <span className={muted}>{cartTotal.toFixed(0)} EGP</span>
                                        </div>
                                        <div className={`flex justify-between font-black text-sm pt-2 mt-1 border-t ${divider}`}>
                                            <span>Total</span>
                                            <span style={{ color: accent }}>{cartTotal.toFixed(0)} EGP</span>
                                        </div>

                                        <button
                                            className="w-full mt-3 py-3 rounded-xl text-white text-xs font-black shadow-lg active:scale-[0.98] transition-transform"
                                            style={{ background: gradient }}
                                        >
                                            Place Order →
                                        </button>
                                        <button
                                            onClick={clearCart}
                                            className={`w-full mt-2 py-2 rounded-xl text-xs font-semibold border transition-colors ${isDarkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-slate-200 text-slate-400 hover:bg-white"}`}
                                        >
                                            Clear Cart
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isDarkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                                        <ShoppingCart className={`w-7 h-7 opacity-30 ${muted}`} />
                                    </div>
                                    <p className={`text-xs font-bold mb-2 ${muted}`}>Your cart is empty</p>
                                    <button
                                        onClick={() => setWsPage("menu")}
                                        className="text-xs font-black"
                                        style={{ color: accent }}
                                    >
                                        Browse Menu →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ABOUT PAGE ──────────────────────────────────────── */}
                    {wsPage === "about" && (
                        <div className="animate-fade-in">
                            {/* About hero */}
                            <div
                                className="relative px-5 py-7 text-white overflow-hidden"
                                style={{ background: gradient }}
                            >
                                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/[0.08]" />
                                <h1 className="text-lg font-black mb-0.5 relative z-10">{displayName}</h1>
                                <p className={`text-[10px] opacity-75 relative z-10`}>
                                    {serviceType === "restaurant" ? "Fine dining experience"
                                    : serviceType === "cafe"       ? "Coffee & cozy vibes"
                                    : serviceType === "salon"      ? "Premium beauty services"
                                    : "Quality products, great service"}
                                </p>
                            </div>

                            {/* Info cards */}
                            <div className="px-4 py-4 space-y-2.5">
                                {[
                                    { icon: "📍", label: "Location",    value: "123 Main Street, Cairo" },
                                    { icon: "⏰", label: "Hours",       value: `${isOpen ? "Open Now" : "Closed"} · 9 AM – 10 PM` },
                                    { icon: "⭐", label: "Rating",      value: `${rating.toFixed(1)} / 5 · based on customer reviews` },
                                    { icon: "📦", label: "Menu Items",  value: `${stats.totalItems} items available` },
                                ].map(info => (
                                    <div key={info.label} className={`flex gap-3 p-3 rounded-xl border ${cardBg}`}>
                                        <span className="text-xl leading-none flex-shrink-0">{info.icon}</span>
                                        <div>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${muted}`}>{info.label}</p>
                                            <p className="text-xs font-semibold mt-0.5">{info.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <div className="px-4 pb-5">
                                <button
                                    onClick={() => setWsPage("menu")}
                                    className="w-full py-3 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-lg"
                                    style={{ background: gradient }}
                                >
                                    <span>View Our Menu</span>
                                    <ArrowRight size={13} />
                                </button>
                            </div>

                            {/* Footer */}
                            <div className={`px-4 py-3 border-t text-center ${divider}`}>
                                <p className={`text-[9px] ${muted}`}>
                                    © {new Date().getFullYear()} {displayName} · All rights reserved
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
