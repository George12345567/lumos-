import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronDown } from "lucide-react";
import type { ServiceTypeConfig } from "@/features/live-preview/constants";

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 40;
const MAX_TAGLINE_LENGTH = 60;
// Disallow HTML injection characters (OWASP: XSS prevention)
const INVALID_CHARS_RE = /[<>"'&]/;

const AI_SUGGESTIONS: Record<string, string[]> = {
  restaurant: ["The Golden Fork", "Spice Garden", "Harvest Table", "Bella Cuisine"],
  cafe: ["Luminary Café", "Brew & Co.", "Morning Ritual", "Urban Roast"],
  pharmacy: ["PharmaPlus", "ClearMed", "HealthBridge", "EasyCare Rx"],
  salon: ["Luxe Studio", "Glow Up", "Aura Salon", "Velvet Hair"],
  store: ["The Daily Market", "Prime Select", "Urban Goods", "ShopEase"],
  clinic: ["MedPoint Clinic", "CareFirst", "HealthNest", "WellPath"],
};

const AI_TAGLINES: Record<string, string[]> = {
  restaurant: ["A taste of perfection", "Where every meal is a memory", "Farm to table, heart to soul"],
  cafe: ["Your daily ritual, elevated", "Sip. Savor. Smile.", "Where ideas are brewed"],
  pharmacy: ["Your health, our priority", "Care you can count on", "Wellness made simple"],
  salon: ["Where beauty meets artistry", "Feel beautiful, inside and out", "Your style, perfected"],
  store: ["Quality finds, every day", "Shop smarter, live better", "Curated for you"],
  clinic: ["Compassionate care, every visit", "Your health journey starts here", "Expert care, trusted results"],
};

const LOGO_EMOJIS: Record<string, string[]> = {
  restaurant: ["🍽️", "🍴", "👨‍🍳", "🥘", "🌮", "🍕", "🍣", "🥗", "🍜", "🍱", "🫕", "🥩"],
  cafe: ["☕", "🫖", "🧁", "🥐", "🍰", "🌿", "✨", "🍵", "🫧", "🎂", "🥤", "🫗"],
  pharmacy: ["💊", "🏥", "🩺", "🧴", "🩹", "💉", "🌡️", "🌿", "💙", "🔬", "❤️‍🩹", "⚕️"],
  salon: ["💇", "✂️", "💅", "🪞", "💄", "🌸", "👑", "✨", "🎀", "🌺", "💍", "🪄"],
  store: ["🛍️", "🏪", "🛒", "⭐", "🎁", "🏷️", "💎", "🌟", "💰", "🏬", "🎯", "🪙"],
  clinic: ["🏥", "❤️", "🩺", "💉", "🌿", "🩹", "💊", "🌡️", "🫀", "🧬", "💙", "🩻"],
};

const MAX_BIO_LENGTH = 100;

const HOUR_OPTIONS = [
  "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
  "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM", "12 AM",
];

export type BrandPersonality = "friendly" | "premium" | "bold";

const PERSONALITY_OPTIONS: { id: BrandPersonality; emoji: string; label: string; desc: string }[] = [
  { id: "friendly", emoji: "😊", label: "Friendly", desc: "Warm & approachable" },
  { id: "premium", emoji: "✨", label: "Premium", desc: "Elegant & refined" },
  { id: "bold", emoji: "🔥", label: "Bold", desc: "Strong & striking" },
];

interface BrandTabProps {
  businessName: string;
  setBusinessName: (value: string) => void;
  tagline: string;
  setTagline: (value: string) => void;
  logoEmoji: string;
  setLogoEmoji: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  brandPersonality: BrandPersonality;
  setBrandPersonality: (value: BrandPersonality) => void;
  // Rating
  rating: number;
  setRating: (value: number) => void;
  // Hours
  openTime: string;
  setOpenTime: (value: string) => void;
  closeTime: string;
  setCloseTime: (value: string) => void;
  // Bio
  bio: string;
  setBio: (value: string) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  serviceTypesConfig: ServiceTypeConfig[];
  iconComponents: Record<string, React.ReactNode>;
}

const BrandTab = ({
  businessName,
  setBusinessName,
  tagline,
  setTagline,
  logoEmoji,
  setLogoEmoji,
  isOpen,
  setIsOpen,
  brandPersonality,
  setBrandPersonality,
  rating,
  setRating,
  openTime,
  setOpenTime,
  closeTime,
  setCloseTime,
  bio,
  setBio,
  serviceType,
  setServiceType,
  serviceTypesConfig,
  iconComponents,
}: BrandTabProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTaglineSuggestions, setShowTaglineSuggestions] = useState(false);

  const bioRemaining = MAX_BIO_LENGTH - bio.length;

  const handleBioChange = (value: string) => {
    const sanitised = value.replace(/[<>"'&]/g, "");
    setBio(sanitised.slice(0, MAX_BIO_LENGTH));
  };

  const errorMsg =
    businessName.length > MAX_NAME_LENGTH
      ? `${MAX_NAME_LENGTH} character limit`
      : INVALID_CHARS_RE.test(businessName)
      ? "Special characters not allowed"
      : null;

  const remaining = MAX_NAME_LENGTH - businessName.length;
  const taglineRemaining = MAX_TAGLINE_LENGTH - tagline.length;
  const suggestions = AI_SUGGESTIONS[serviceType] ?? AI_SUGGESTIONS.restaurant;
  const taglineSuggestions = AI_TAGLINES[serviceType] ?? AI_TAGLINES.restaurant;
  const emojiSet = LOGO_EMOJIS[serviceType] ?? LOGO_EMOJIS.restaurant;

  const handleNameChange = (value: string) => {
    // Sanitise: strip injection chars before setting state
    const sanitised = value.replace(/[<>"'&]/g, "");
    setBusinessName(sanitised.slice(0, MAX_NAME_LENGTH));
  };

  const handleTaglineChange = (value: string) => {
    const sanitised = value.replace(/[<>"'&]/g, "");
    setTagline(sanitised.slice(0, MAX_TAGLINE_LENGTH));
  };

  const handleBlur = () => {
    setBusinessName(businessName.trim());
  };

  return (
    <motion.div
      key="brand"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* ══════════════════════════════════════════════════
          1. BUSINESS NAME
      ══════════════════════════════════════════════════ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="studio-business-name"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
          >
            Business Name
          </label>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-mono transition-colors ${
                remaining <= 10
                  ? remaining <= 0
                    ? "text-red-400"
                    : "text-amber-400"
                  : "text-slate-500"
              }`}
              aria-live="polite"
              aria-label={`${remaining} characters remaining`}
            >
              {remaining}
            </span>
            <button
              onClick={() => setShowSuggestions((v) => !v)}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all border ${
                showSuggestions
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-slate-400 hover:text-primary hover:border-primary/30"
              }`}
              aria-expanded={showSuggestions}
              aria-label="Show AI name suggestions"
            >
              <Sparkles size={8} aria-hidden="true" />
              AI
              <ChevronDown
                size={8}
                className={`transition-transform ${showSuggestions ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.05] p-2 space-y-1"
              role="listbox"
              aria-label="Suggested business names"
            >
              <p className="text-[9px] text-slate-400 px-1 pb-0.5">Tap to apply</p>
              {suggestions.map((name) => (
                <button
                  key={name}
                  role="option"
                  aria-selected={businessName === name}
                  onClick={() => {
                    setBusinessName(name);
                    setShowSuggestions(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-primary/10 ${
                    businessName === name
                      ? "bg-primary/10 text-primary"
                      : "text-slate-400 hover:text-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <input
            id="studio-business-name"
            type="text"
            value={businessName}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Enter your brand name..."
            maxLength={MAX_NAME_LENGTH}
            className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
              errorMsg
                ? "border-red-400/50 focus:ring-red-400/25 focus:border-red-400/50"
                : "border-border focus:ring-primary/25 focus:border-primary/30"
            }`}
            aria-label="Business name"
            aria-invalid={!!errorMsg}
            aria-describedby={errorMsg ? "name-error" : undefined}
          />
          {businessName && (
            <button
              onClick={() => setBusinessName("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Clear business name"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        {errorMsg && (
          <p id="name-error" role="alert" className="text-[10px] text-red-400 font-medium px-1">
            {errorMsg}
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          2. TAGLINE
      ══════════════════════════════════════════════════ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="studio-tagline"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
          >
            Tagline{" "}
            <span className="normal-case font-normal text-slate-500">optional</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-mono transition-colors ${
                taglineRemaining <= 15 ? "text-amber-400" : "text-slate-500"
              }`}
              aria-live="polite"
            >
              {taglineRemaining}
            </span>
            <button
              onClick={() => setShowTaglineSuggestions((v) => !v)}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all border ${
                showTaglineSuggestions
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-slate-400 hover:text-primary hover:border-primary/30"
              }`}
              aria-expanded={showTaglineSuggestions}
              aria-label="Show AI tagline suggestions"
            >
              <Sparkles size={8} aria-hidden="true" />
              AI
              <ChevronDown
                size={8}
                className={`transition-transform ${showTaglineSuggestions ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showTaglineSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.05] p-2 space-y-1"
              role="listbox"
              aria-label="Suggested taglines"
            >
              <p className="text-[9px] text-slate-400 px-1 pb-0.5">Tap to apply</p>
              {taglineSuggestions.map((s) => (
                <button
                  key={s}
                  role="option"
                  aria-selected={tagline === s}
                  onClick={() => {
                    setTagline(s);
                    setShowTaglineSuggestions(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-primary/10 ${
                    tagline === s ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <input
            id="studio-tagline"
            type="text"
            value={tagline}
            onChange={(e) => handleTaglineChange(e.target.value)}
            onBlur={() => setTagline(tagline.trim())}
            placeholder="A taste of perfection…"
            maxLength={MAX_TAGLINE_LENGTH}
            className="w-full bg-black/30 border border-border rounded-xl px-4 py-2.5 text-foreground text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 transition-all"
            aria-label="Brand tagline"
          />
          {tagline && (
            <button
              onClick={() => setTagline("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Clear tagline"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3. LOGO EMOJI
      ══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Logo Icon
          </span>
          <AnimatePresence>
            {logoEmoji && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setLogoEmoji("")}
                className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-red-400 transition-colors"
                aria-label="Clear logo icon"
              >
                <X size={8} aria-hidden="true" />
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div
          className="grid grid-cols-6 gap-1.5"
          role="group"
          aria-label="Select logo emoji"
        >
          {emojiSet.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setLogoEmoji(logoEmoji === emoji ? "" : emoji)}
              className={`h-9 text-base rounded-xl border transition-all flex items-center justify-center ${
                logoEmoji === emoji
                  ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20 scale-110 shadow-[0_0_10px_rgba(0,188,212,0.2)]"
                  : "border-border bg-black/20 hover:border-primary/40 hover:bg-black/40 hover:scale-105"
              }`}
              aria-pressed={logoEmoji === emoji}
              aria-label={`Logo: ${emoji}`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {logoEmoji && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 bg-primary/[0.04]"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base">
                {logoEmoji}
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground">
                  {businessName || "Your Brand"}
                </p>
                <p className="text-[9px] text-slate-400">
                  Shows in preview header
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════
          4. STATUS + PERSONALITY
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Open / Closed */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Status
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
              isOpen
                ? "border-emerald-500/30 bg-emerald-500/[0.06] hover:bg-emerald-500/10"
                : "border-red-400/30 bg-red-400/[0.06] hover:bg-red-400/10"
            }`}
            aria-pressed={isOpen}
            aria-label={
              isOpen
                ? "Currently open — click to mark as closed"
                : "Currently closed — click to mark as open"
            }
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isOpen
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse"
                    : "bg-red-400/70"
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[11px] font-bold ${
                  isOpen ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {isOpen ? "Open" : "Closed"}
              </span>
            </div>
            {/* pill toggle */}
            <div
              className={`w-8 h-4 rounded-full relative transition-colors flex items-center flex-shrink-0 ${
                isOpen ? "bg-emerald-500" : "bg-slate-600"
              }`}
              aria-hidden="true"
            >
              <div
                className={`w-3 h-3 rounded-full bg-white absolute shadow-sm transition-all duration-200 ${
                  isOpen ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Brand personality */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Personality
          </span>
          <div className="flex gap-1" role="group" aria-label="Brand personality">
            {PERSONALITY_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setBrandPersonality(p.id)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all ${
                  brandPersonality === p.id
                    ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_8px_rgba(0,188,212,0.1)]"
                    : "border-border bg-black/20 hover:border-primary/30 hover:bg-black/40"
                }`}
                aria-pressed={brandPersonality === p.id}
                title={p.desc}
                aria-label={`${p.label} personality — ${p.desc}`}
              >
                <span className="text-base leading-none mb-0.5" aria-hidden="true">
                  {p.emoji}
                </span>
                <span
                  className={`text-[9px] font-bold ${
                    brandPersonality === p.id ? "text-primary" : "text-slate-500"
                  }`}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. RATING
      ══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Rating
          </span>
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            ⭐ {rating.toFixed(1)}
          </span>
        </div>
        {/* Slider */}
        <input
          type="range"
          min={1}
          max={5}
          step={0.1}
          value={rating}
          onChange={(e) => setRating(parseFloat(e.target.value))}
          className="w-full accent-primary cursor-pointer"
          aria-label="Business rating"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={rating}
        />
        {/* Star visual */}
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="text-sm transition-opacity"
                style={{ opacity: star <= Math.round(rating) ? 1 : 0.25 }}
              >
                ⭐
              </span>
            ))}
          </div>
          {/* Quick presets */}
          <div className="flex gap-1" role="group" aria-label="Rating presets">
            {[4.5, 4.8, 5.0].map((preset) => (
              <button
                key={preset}
                onClick={() => setRating(preset)}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                  Math.abs(rating - preset) < 0.05
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                    : "border-border text-slate-500 hover:border-amber-400/30 hover:text-amber-400"
                }`}
                aria-pressed={Math.abs(rating - preset) < 0.05}
              >
                {preset.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          6. BUSINESS HOURS
      ══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          Business Hours
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* Opens */}
          <div className="space-y-1">
            <label htmlFor="studio-open-time" className="text-[9px] text-slate-500 font-medium">
              Opens
            </label>
            <select
              id="studio-open-time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="w-full bg-black/30 border border-border rounded-xl px-2.5 py-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 transition-all cursor-pointer"
              aria-label="Opening time"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          {/* Closes */}
          <div className="space-y-1">
            <label htmlFor="studio-close-time" className="text-[9px] text-slate-500 font-medium">
              Closes
            </label>
            <select
              id="studio-close-time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full bg-black/30 border border-border rounded-xl px-2.5 py-2 text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 transition-all cursor-pointer"
              aria-label="Closing time"
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Preview pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-black/20">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} aria-hidden="true" />
          <span className="text-[10px] text-slate-400">
            {isOpen ? "Open · " : "Closed · "}
            <span className="text-foreground font-medium">{openTime} – {closeTime}</span>
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          7. BIO / ABOUT
      ══════════════════════════════════════════════════ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="studio-bio"
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
          >
            About{" "}
            <span className="normal-case font-normal text-slate-500">optional</span>
          </label>
          <span
            className={`text-[9px] font-mono transition-colors ${
              bioRemaining <= 20 ? "text-amber-400" : "text-slate-500"
            }`}
            aria-live="polite"
          >
            {bioRemaining}
          </span>
        </div>
        <div className="relative">
          <textarea
            id="studio-bio"
            value={bio}
            onChange={(e) => handleBioChange(e.target.value)}
            onBlur={() => setBio(bio.trim())}
            placeholder="Describe your business in a sentence…"
            maxLength={MAX_BIO_LENGTH}
            rows={2}
            className="w-full bg-black/30 border border-border rounded-xl px-4 py-2.5 text-foreground text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 transition-all resize-none"
            aria-label="Business bio"
          />
          {bio && (
            <button
              onClick={() => setBio("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Clear bio"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          8. SERVICE TYPE
      ══════════════════════════════════════════════════ */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Service Type
        </label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Service type selection">
          {serviceTypesConfig.map((type) => (
            <button
              key={type.id}
              onClick={() => setServiceType(type.id)}
              className={`relative p-3 rounded-xl border transition-all duration-300 text-left group ${
                serviceType === type.id
                  ? "border-primary/30 bg-primary/[0.08]"
                  : "border-border bg-black/20 hover:border-primary/50 hover:bg-black/40"
              }`}
              aria-pressed={serviceType === type.id}
              aria-label={`Select service type ${type.name}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 ${
                    serviceType === type.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-slate-400"
                  }`}
                >
                  {iconComponents[type.iconName]}
                </div>
                <span
                  className={`text-xs font-bold ${
                    serviceType === type.id ? "text-primary" : "text-slate-500"
                  }`}
                >
                  {type.name}
                </span>
              </div>
              {serviceType === type.id && (
                <motion.div
                  layoutId="service-indicator"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,188,212,0.5)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default BrandTab;

