import { useState } from "react";
import { motion } from "framer-motion";
import {
  Smartphone, Tablet, Monitor, Grid3x3, List,
  Box, CheckCircle2, ArrowLeftRight,
} from "lucide-react";
import type {
  TemplateConfig,
  TemplateType,
  CategoryStyle,
  ButtonStyle,
  FeaturedStyle,
  NavStyle,
  NavPlacement,
  HeaderStyle,
  CardStyle,
  SearchStyle,
  PriceStyle,
  StatsStyle,
} from "@/features/live-preview/templates";

type PreviewMode = "app" | "web";
type DeviceView = "mobile" | "tablet" | "desktop";
type ViewMode = "list" | "grid";

interface LayoutTabProps {
  templates: TemplateConfig[];
  selectedTemplate: TemplateType;
  setSelectedTemplate: (value: TemplateType) => void;
  selectedCategoryStyle: CategoryStyle;
  setSelectedCategoryStyle: (value: CategoryStyle) => void;
  selectedButtonStyle: ButtonStyle;
  setSelectedButtonStyle: (value: ButtonStyle) => void;
  selectedFeaturedStyle: FeaturedStyle;
  setSelectedFeaturedStyle: (value: FeaturedStyle) => void;
  selectedNavStyle: NavStyle;
  setSelectedNavStyle: (value: NavStyle) => void;
  selectedNavPlacement: NavPlacement;
  setSelectedNavPlacement: (value: NavPlacement) => void;
  selectedHeaderStyle: HeaderStyle;
  setSelectedHeaderStyle: (value: HeaderStyle) => void;
  selectedCardStyle: CardStyle;
  setSelectedCardStyle: (value: CardStyle) => void;
  selectedSearchStyle: SearchStyle;
  setSelectedSearchStyle: (value: SearchStyle) => void;
  selectedPriceStyle: PriceStyle;
  setSelectedPriceStyle: (value: PriceStyle) => void;
  selectedStatsStyle: StatsStyle;
  setSelectedStatsStyle: (value: StatsStyle) => void;
  previewMode: PreviewMode;
  setPreviewMode: (value: PreviewMode) => void;
  deviceView: DeviceView;
  setDeviceView: (value: DeviceView) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  enable3D: boolean;
  setEnable3D: (value: boolean) => void;
  rotationX: number;
  setRotationX: (value: number) => void;
  rotationY: number;
  setRotationY: (value: number) => void;
}

const LayoutTab = ({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  selectedCategoryStyle,
  setSelectedCategoryStyle,
  selectedButtonStyle,
  setSelectedButtonStyle,
  selectedFeaturedStyle,
  setSelectedFeaturedStyle,
  selectedNavStyle,
  setSelectedNavStyle,
  selectedNavPlacement,
  setSelectedNavPlacement,
  selectedHeaderStyle,
  setSelectedHeaderStyle,
  selectedCardStyle,
  setSelectedCardStyle,
  selectedSearchStyle,
  setSelectedSearchStyle,
  selectedPriceStyle,
  setSelectedPriceStyle,
  selectedStatsStyle,
  setSelectedStatsStyle,
  previewMode,
  setPreviewMode,
  deviceView,
  setDeviceView,
  viewMode,
  setViewMode,
  enable3D,
  setEnable3D,
  rotationX,
  setRotationX,
  rotationY,
  setRotationY,
}: LayoutTabProps) => {
  const [compareMode, setCompareMode] = useState(false);
  const [compareTemplate, setCompareTemplate] = useState<TemplateType | null>(null);

  const currentTmpl = templates.find((t) => t.id === selectedTemplate)!;
  const compareTmpl = compareTemplate ? templates.find((t) => t.id === compareTemplate) : null;

  return (
    <motion.div
      key="layout"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* ── PREVIEW CATEGORY ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Preview Category
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { id: "app" as const, icon: "📱", label: "App", desc: "Mobile app shell" },
            { id: "web" as const, icon: "🌐", label: "Website", desc: "Web page layout" },
          ]).map(({ id, icon, label, desc }) => {
            const isActive = previewMode === id;
            return (
              <button
                key={id}
                onClick={() => setPreviewMode(id)}
                aria-pressed={isActive}
                className={`relative p-0 rounded-xl border overflow-hidden text-left transition-all duration-200 ${isActive
                  ? "border-primary/50 scale-[1.02]"
                  : "border-border bg-black/20 hover:border-slate-300/50 hover:scale-[1.01]"
                  }`}
                style={isActive ? { boxShadow: "0 0 14px rgba(0,188,212,0.25)" } : {}}
              >
                <div
                  className="h-1 w-full"
                  style={{ background: isActive ? "linear-gradient(90deg,#00bcd4,#00acc1)" : "#1e293b" }}
                />
                <div className="p-2 flex items-center gap-2">
                  <span className="text-lg leading-none" role="img" aria-hidden="true">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-black leading-none ${isActive ? "text-foreground" : "text-slate-400"
                      }`}>{label}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  {isActive && <CheckCircle2 size={11} className="text-primary flex-shrink-0" aria-hidden="true" />}
                </div>
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: "rgba(0,188,212,0.04)", boxShadow: "inset 0 0 0 1.5px rgba(0,188,212,0.25)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TEMPLATE SELECTOR (App mode only) ── */}
      <div className="space-y-2" style={{ opacity: previewMode === "web" ? 0.35 : 1, pointerEvents: previewMode === "web" ? "none" : "auto", transition: "opacity 0.25s" }}>
        {previewMode === "web" && (
          <p className="text-[9px] text-slate-500 bg-primary/[0.07] border border-primary/10 rounded-lg px-2.5 py-2 text-center font-medium">
            🌐 App style templates are inactive in Website mode
          </p>
        )}
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Template — Pick a Style
          </label>
          <button
            onClick={() => {
              setCompareMode((v) => !v);
              if (compareMode) setCompareTemplate(null);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${compareMode
              ? "bg-primary text-white border-primary"
              : "text-slate-400 hover:text-primary border-border"
              }`}
            aria-pressed={compareMode}
            aria-label="Toggle template compare mode"
          >
            <ArrowLeftRight size={9} aria-hidden="true" />
            Compare
          </button>
        </div>

        {/* Compare panel */}
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-2 overflow-hidden"
          >
            <p className="text-[9px] text-muted-foreground font-medium">Compare with:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {templates
                .filter((t) => t.id !== selectedTemplate)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCompareTemplate(t.id)}
                    className={`p-2 rounded-lg border text-center transition-all ${compareTemplate === t.id
                      ? "border-primary/40 bg-primary/[0.1]"
                      : "border-border bg-black/20 hover:border-primary/30"
                      }`}
                    aria-pressed={compareTemplate === t.id}
                    aria-label={`Compare with ${t.name} template`}
                  >
                    <span className="text-sm block" role="img" aria-hidden="true">
                      {t.icon}
                    </span>
                    <p
                      className={`text-[9px] font-bold mt-0.5 ${compareTemplate === t.id ? "text-primary" : "text-slate-400"
                        }`}
                    >
                      {t.name}
                    </p>
                  </button>
                ))}
            </div>

            {/* Side-by-side comparison */}
            {compareTmpl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-primary/10"
              >
                {/* Current */}
                <div className="space-y-1">
                  <p className="text-[8px] text-primary font-bold uppercase tracking-wider">
                    Current
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.05] overflow-hidden">
                    <div className="h-0.5" style={{ background: currentTmpl.accent }} />
                    <div className="p-2">
                      <div className="text-base" role="img" aria-label={currentTmpl.name}>
                        {currentTmpl.icon}
                      </div>
                      <p className="text-[9px] font-bold text-foreground mt-0.5">
                        {currentTmpl.name}
                      </p>
                      <p className="text-[8px] text-slate-400">{currentTmpl.desc}</p>
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {currentTmpl.tags.map((tag) => (
                          <span key={tag} className="text-[7px] px-1 py-0.5 rounded-full"
                            style={{ background: `${currentTmpl.accent}20`, color: currentTmpl.accent }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Compare */}
                <div className="space-y-1">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                    Versus
                  </p>
                  <div className="rounded-lg border border-border bg-black/20 overflow-hidden">
                    <div className="h-0.5" style={{ background: compareTmpl.accent }} />
                    <div className="p-2">
                      <div className="text-base" role="img" aria-label={compareTmpl.name}>
                        {compareTmpl.icon}
                      </div>
                      <p className="text-[9px] font-bold text-foreground mt-0.5">
                        {compareTmpl.name}
                      </p>
                      <p className="text-[8px] text-slate-400">{compareTmpl.desc}</p>
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {compareTmpl.tags.map((tag) => (
                          <span key={tag} className="text-[7px] px-1 py-0.5 rounded-full"
                            style={{ background: `${compareTmpl.accent}20`, color: compareTmpl.accent }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(compareTmpl.id);
                    setCompareMode(false);
                    setCompareTemplate(null);
                  }}
                  className="col-span-2 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold hover:bg-primary/20 transition-all"
                  aria-label={`Switch to ${compareTmpl.name} template`}
                >
                  Switch to {compareTmpl.name} →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => {
            const isSelected = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`relative p-0 rounded-xl border overflow-hidden text-left transition-all duration-200 ${isSelected
                  ? "border-primary/50 scale-[1.02]"
                  : "border-border bg-black/20 hover:border-slate-300/50 hover:scale-[1.01]"
                  }`}
                style={isSelected ? { boxShadow: `0 0 16px ${t.accent}30` } : {}}
                aria-pressed={isSelected}
                aria-label={`Select ${t.name} template: ${t.desc}`}
              >
                {/* Accent color swatch strip */}
                <div
                  className="h-1.5 w-full"
                  style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.accent}50)` }}
                />
                <div className="p-2.5">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xl leading-none" role="img" aria-hidden="true">
                      {t.icon}
                    </span>
                    <div className="flex items-center gap-1">
                      {t.isNew && (
                        <span
                          className="text-[7px] font-black px-1.5 py-0.5 rounded-full text-white leading-none"
                          style={{ background: t.accent }}
                        >
                          NEW
                        </span>
                      )}
                      {isSelected && (
                        <CheckCircle2 size={11} className="text-primary" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-[11px] font-bold leading-tight mb-0.5 ${isSelected ? "text-foreground" : "text-slate-300"
                      }`}
                  >
                    {t.name}
                  </p>
                  <p className="text-[8.5px] text-slate-500 leading-tight mb-1.5">{t.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[7.5px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={
                          isSelected
                            ? { background: `${t.accent}18`, color: t.accent }
                            : { background: "rgba(255,255,255,0.05)", color: "#475569" }
                        }
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: `${t.accent}06`, boxShadow: `inset 0 0 0 1.5px ${t.accent}35` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── COMPONENTS MIXER ── */}
      <div className="space-y-3 pt-3 border-t border-slate-200/60">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Component Mixer Pro
        </label>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-2.5 py-2">
          <p className="text-[9px] text-cyan-300 font-bold uppercase tracking-[0.18em] mb-2">Micro</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Price Label</span>
              <select value={selectedPriceStyle} onChange={(e) => setSelectedPriceStyle(e.target.value as PriceStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["plain", "pill", "tag", "chip", "glow"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Search Style</span>
              <select value={selectedSearchStyle} onChange={(e) => setSelectedSearchStyle(e.target.value as SearchStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["minimal", "soft", "pill", "glass", "underline", "terminal"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Category Style</span>
              <select value={selectedCategoryStyle} onChange={(e) => setSelectedCategoryStyle(e.target.value as CategoryStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["pill", "underline", "chip", "block", "glow", "tag", "minimal"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Button Style</span>
              <select value={selectedButtonStyle} onChange={(e) => setSelectedButtonStyle(e.target.value as ButtonStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["filled", "outline", "ghost", "gradient", "glow", "soft", "bold"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-2.5 py-2">
          <p className="text-[9px] text-violet-300 font-bold uppercase tracking-[0.18em] mb-2">Meso</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Header Style</span>
              <select value={selectedHeaderStyle} onChange={(e) => setSelectedHeaderStyle(e.target.value as HeaderStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["default", "glass", "split", "centered", "compact", "banner"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Card Skin</span>
              <select value={selectedCardStyle} onChange={(e) => setSelectedCardStyle(e.target.value as CardStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["elevated", "flat", "outline", "neo", "inset", "brutal"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Featured Block</span>
              <select value={selectedFeaturedStyle} onChange={(e) => setSelectedFeaturedStyle(e.target.value as FeaturedStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["banner", "card", "strip", "glow", "badge", "overlay", "wave"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Stats Block</span>
              <select value={selectedStatsStyle} onChange={(e) => setSelectedStatsStyle(e.target.value as StatsStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["card", "strip", "minimal", "glass", "tiles"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-2.5 py-2">
          <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-[0.18em] mb-2">Macro</p>
          <div className="space-y-2">
            <p className="text-[9px] text-slate-500">Navigation Placement</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: "bottom" as const, label: "Bottom" },
                { id: "side" as const, label: "Side" },
                { id: "floating" as const, label: "Floating" },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedNavPlacement(id)}
                  className={`px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all ${selectedNavPlacement === id ? "border-primary/40 bg-primary/[0.1] text-primary" : "border-border bg-black/20 text-slate-400"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="text-[9px] text-slate-500 flex flex-col gap-1">
              <span>Nav Style</span>
              <select value={selectedNavStyle} onChange={(e) => setSelectedNavStyle(e.target.value as NavStyle)} className="rounded-lg border border-border bg-black/20 px-2 py-1.5 text-[10px]">
                {(["default", "minimal", "pill", "neon", "block"] as const).map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── DEVICE PREVIEW ── */}
      <div className="space-y-2 pt-3 border-t border-slate-200/60">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Device Preview
        </label>
        <div
          className="flex bg-muted/80 border border-slate-200/60 p-0.5 rounded-xl"
          role="group"
          aria-label="Device preview type"
        >
          {(
            [
              { id: "mobile" as const, icon: Smartphone },
              { id: "tablet" as const, icon: Tablet },
              { id: "desktop" as const, icon: Monitor },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setDeviceView(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all ${deviceView === id
                ? "bg-primary text-white shadow-[0_0_12px_rgba(0,188,212,0.25)]"
                : "text-slate-400 hover:text-muted-foreground"
                }`}
              aria-pressed={deviceView === id}
              aria-label={`Preview on ${id}`}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="capitalize">{id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── VIEW MODE ── */}
      <div className="space-y-2 pt-3 border-t border-slate-200/60">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          View Mode
        </label>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Menu view mode"
        >
          {(
            [
              { id: "list" as const, icon: List, label: "List" },
              { id: "grid" as const, icon: Grid3x3, label: "Grid" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${viewMode === id
                ? "border-primary/30 bg-primary/[0.06] text-primary"
                : "border-border bg-black/20 text-slate-400"
                }`}
              aria-pressed={viewMode === id}
              aria-label={`${label} view mode`}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D CONTROLS ── */}
      <div className="space-y-2 pt-3 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Box size={10} className="text-primary/60" aria-hidden="true" />
            3D Controls
          </label>
          <button
            onClick={() => setEnable3D(!enable3D)}
            className={`w-10 h-5 rounded-full transition-all relative ${enable3D ? "bg-primary" : "bg-muted"}`}
            aria-pressed={enable3D}
            aria-label={`3D rotation: ${enable3D ? "on" : "off"}`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${enable3D ? "translate-x-5" : "translate-x-0.5"
                }`}
            />
          </button>
        </div>
        {enable3D && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <div>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-slate-300">Horizontal</span>
                <span className="text-primary/60 font-mono">{rotationY}°</span>
              </div>
              <input
                type="range"
                value={rotationY}
                onChange={(e) => setRotationY(Number(e.target.value))}
                min={-15}
                max={15}
                className="w-full accent-primary h-1"
                aria-label={`Horizontal rotation ${rotationY} degrees`}
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-slate-300">Vertical</span>
                <span className="text-primary/60 font-mono">{rotationX}°</span>
              </div>
              <input
                type="range"
                value={rotationX}
                onChange={(e) => setRotationX(Number(e.target.value))}
                min={-15}
                max={15}
                className="w-full accent-primary h-1"
                aria-label={`Vertical rotation ${rotationX} degrees`}
              />
            </div>
            <button
              onClick={() => {
                setRotationX(0);
                setRotationY(0);
              }}
              className="text-[10px] text-primary/50 hover:text-primary font-medium w-full text-center"
              aria-label="Reset 3D position to center"
            >
              Reset Position
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LayoutTab;
