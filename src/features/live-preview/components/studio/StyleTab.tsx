import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Zap, AlertTriangle } from "lucide-react";
import type { Theme } from "@/types";

type TextureType = "none" | "noise" | "grid" | "dots";

// ── WCAG colour utilities ──────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function relativeLuminance(r: number, g: number, b: number): number {
  return [r, g, b]
    .map((c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(hex: string, against = "#ffffff"): number | null {
  const rgb1 = hexToRgb(hex);
  const rgb2 = hexToRgb(against);
  if (!rgb1 || !rgb2) return null;
  const L1 = relativeLuminance(...rgb1);
  const L2 = relativeLuminance(...rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function wcagLabel(ratio: number | null): { label: string; color: string } {
  if (ratio === null) return { label: "—", color: "text-slate-400" };
  if (ratio >= 7) return { label: `AAA ${ratio.toFixed(1)}:1`, color: "text-emerald-400" };
  if (ratio >= 4.5) return { label: `AA ${ratio.toFixed(1)}:1`, color: "text-green-400" };
  if (ratio >= 3) return { label: `AA-LG ${ratio.toFixed(1)}:1`, color: "text-amber-400" };
  return { label: `Fail ${ratio.toFixed(1)}:1`, color: "text-red-400" };
}

// ── Palette harmonization utilities ───────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${v.toString(16).padStart(2, "0").repeat(3)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hN = h / 360;
  const vals = [hN + 1 / 3, hN, hN - 1 / 3].map((t) =>
    Math.round(hue2rgb(p, q, t) * 255)
  );
  return `#${vals.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Generate a harmonious accent from a primary hex (150° triadic shift). */
function harmonizeAccent(primaryHex: string): string {
  const hsl = hexToHsl(primaryHex);
  if (!hsl) return primaryHex;
  const [h, s, l] = hsl;
  const newH = (h + 150) % 360;
  const newL = Math.max(0.4, Math.min(0.7, l + 0.05));
  return hslToHex(newH, s, newL);
}

// ── Component ─────────────────────────────────────────────────────────────

interface StyleTabProps {
  themes: Theme[];
  selectedTheme: string;
  setSelectedTheme: (value: string) => void;
  customTheme: { primary: string; accent: string; gradient: string };
  updateCustomTheme: (colorType: "primary" | "accent", color: string) => void;
  glassEffect: boolean;
  setGlassEffect: (value: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  activeTexture: TextureType;
  setActiveTexture: (value: TextureType) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  onApplyPerformanceMode: () => void;
}

const StyleTab = ({
  themes,
  selectedTheme,
  setSelectedTheme,
  customTheme,
  updateCustomTheme,
  glassEffect,
  setGlassEffect,
  isDarkMode,
  setIsDarkMode,
  activeTexture,
  setActiveTexture,
  fontSize,
  setFontSize,
  onApplyPerformanceMode,
}: StyleTabProps) => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = () => setPrefersReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const primaryContrast = wcagLabel(contrastRatio(customTheme.primary, "#ffffff"));
  const accentContrast = wcagLabel(contrastRatio(customTheme.accent, "#ffffff"));

  return (
    <motion.div
      key="style"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* ── THEME PRESETS ── */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Palette size={10} className="text-primary/60" aria-hidden="true" />
          Theme
        </label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Preset themes">
          {themes.filter((t) => !t.custom).map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={`p-2.5 rounded-xl border transition-all ${
                selectedTheme === theme.id
                  ? "border-primary/30 bg-primary/[0.08]"
                  : "border-border bg-black/20 hover:border-slate-300"
              }`}
              aria-pressed={selectedTheme === theme.id}
              aria-label={`Select ${theme.name} theme`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-lg"
                  style={{ background: theme.gradient }}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-bold ${
                    selectedTheme === theme.id ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {theme.name}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Custom colour picker */}
        <div
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            selectedTheme === "custom"
              ? "border-primary/30 bg-primary/[0.06]"
              : "border-border bg-black/20"
          }`}
          onClick={() => setSelectedTheme("custom")}
          role="button"
          aria-label="Select custom colours"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedTheme("custom");
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-slate-500">Custom Colors</span>
            </div>
            {selectedTheme === "custom" && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["primary", "accent"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-300 capitalize">{k}</span>
                  {/* WCAG contrast badge */}
                  <span
                    className={`text-[8px] font-mono font-bold ${
                      k === "primary" ? primaryContrast.color : accentContrast.color
                    }`}
                    title={`Contrast ratio vs white (WCAG)`}
                  >
                    {k === "primary" ? primaryContrast.label : accentContrast.label}
                  </span>
                </div>
                <div className="relative h-8 rounded-lg overflow-hidden border border-slate-200">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: customTheme[k] }}
                    aria-hidden="true"
                  />
                  <input
                    type="color"
                    value={customTheme[k]}
                    onChange={(e) => {
                      updateCustomTheme(k, e.target.value);
                      setSelectedTheme("custom");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label={`Pick ${k} colour`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Harmonize button */}
          {selectedTheme === "custom" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const harmAccent = harmonizeAccent(customTheme.primary);
                updateCustomTheme("accent", harmAccent);
              }}
              className="mt-2 w-full text-[9px] font-bold text-primary/60 hover:text-primary border border-primary/10 hover:border-primary/30 rounded-lg py-1 transition-all"
              aria-label="Auto-harmonize accent colour from primary"
            >
              ✦ Harmonize Accent
            </button>
          )}
        </div>
      </div>

      {/* ── EFFECTS ── */}
      <div className="space-y-2 pt-3 border-t border-slate-200/60">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Effects
        </label>

        {/* Glassmorphism */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-black/20">
          <div>
            <span className="text-xs font-bold text-slate-500">Glassmorphism</span>
            <p className="text-[9px] text-slate-300">Blur and transparency</p>
          </div>
          <button
            onClick={() => setGlassEffect(!glassEffect)}
            className={`w-10 h-5 rounded-full transition-all relative ${
              glassEffect ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={glassEffect}
            aria-label={`Glass effect: ${glassEffect ? "on" : "off"}`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                glassEffect ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-black/20">
          <div>
            <span className="text-xs font-bold text-slate-500">Dark Mode</span>
            <p className="text-[9px] text-slate-300">Preview in dark</p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-10 h-5 rounded-full transition-all relative ${
              isDarkMode ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={isDarkMode}
            aria-label={`Dark mode: ${isDarkMode ? "on" : "off"}`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                isDarkMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Texture */}
        <div
          className="grid grid-cols-4 gap-1.5"
          role="group"
          aria-label="Background texture"
        >
          {(
            [
              { id: "none", label: "None" },
              { id: "noise", label: "Noise" },
              { id: "grid", label: "Grid" },
              { id: "dots", label: "Dots" },
            ] as const
          ).map((tex) => (
            <button
              key={tex.id}
              onClick={() => setActiveTexture(tex.id)}
              className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${
                activeTexture === tex.id
                  ? "border-primary/30 bg-primary text-white"
                  : "border-border bg-black/20 text-slate-400"
              }`}
              aria-pressed={activeTexture === tex.id}
              aria-label={`Texture: ${tex.label}`}
            >
              {tex.label}
            </button>
          ))}
        </div>

        {/* Performance mode */}
        <div className="pt-1">
          {prefersReduced && (
            <p className="flex items-center gap-1 text-[9px] text-amber-400 font-medium mb-1.5">
              <AlertTriangle size={9} aria-hidden="true" />
              System prefers reduced motion
            </p>
          )}
          <button
            onClick={onApplyPerformanceMode}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-border bg-black/20 hover:border-primary/30 hover:bg-primary/[0.04] transition-all text-left"
            aria-label="Apply performance mode: disable glass and texture effects"
          >
            <Zap size={12} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
            <div>
              <span className="text-xs font-bold text-slate-400 block">Performance Mode</span>
              <span className="text-[9px] text-slate-500">Disable heavy effects</span>
            </div>
          </button>
        </div>
      </div>

      {/* ── FONT SCALE ── */}
      <div className="space-y-2 pt-3 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Font Scale
          </label>
          {fontSize > 1.2 && (
            <span className="flex items-center gap-1 text-[9px] text-amber-400 font-medium">
              <AlertTriangle size={9} aria-hidden="true" />
              May overflow
            </span>
          )}
        </div>
        <input
          type="range"
          value={fontSize}
          onChange={(e) => setFontSize(parseFloat(e.target.value))}
          min={0.8}
          max={1.3}
          step={0.05}
          className="w-full accent-primary h-1"
          aria-label={`Font scale: ${fontSize.toFixed(2)}×`}
          aria-valuemin={0.8}
          aria-valuemax={1.3}
          aria-valuenow={fontSize}
          aria-valuetext={`${Math.round(fontSize * 100)}%`}
        />
        <div className="flex justify-between text-[9px] text-slate-300">
          <span>Small</span>
          <span className="text-primary/60 font-mono">{Math.round(fontSize * 100)}%</span>
          <span>Large</span>
        </div>
        {fontSize > 1.2 && (
          <p className="text-[9px] text-amber-400/80 leading-tight">
            Large scale may cause text overflow in compact templates. Recommended: ≤120%.
          </p>
        )}
        <button
          onClick={() => setFontSize(1)}
          className="text-[9px] text-primary/50 hover:text-primary font-medium w-full text-right"
          aria-label="Reset font scale to default"
        >
          Reset to default
        </button>
      </div>
    </motion.div>
  );
};

export default StyleTab;
