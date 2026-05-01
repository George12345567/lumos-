/**
 * templates.ts — Shared template configuration
 * Used by LivePreviewTool (studio) AND MobileDemoPage (public preview)
 */

export type TemplateType = "aether" | "brutal";
export type CategoryStyle = "pill" | "underline" | "chip" | "block" | "glow" | "tag" | "minimal";
export type ButtonStyle = "filled" | "outline" | "ghost" | "gradient" | "glow" | "soft" | "bold";
export type NavStyle = "default" | "minimal" | "pill" | "neon" | "block";
export type FeaturedStyle = "banner" | "card" | "strip" | "glow" | "badge" | "overlay" | "wave";
export type NavPlacement = "bottom" | "side" | "floating";
export type HeaderStyle = "default" | "glass" | "split" | "centered" | "compact" | "banner";
export type CardStyle = "elevated" | "flat" | "outline" | "neo" | "inset" | "brutal";
export type SearchStyle = "minimal" | "soft" | "pill" | "glass" | "underline" | "terminal";
export type PriceStyle = "plain" | "pill" | "tag" | "chip" | "glow";
export type StatsStyle = "card" | "strip" | "minimal" | "glass" | "tiles";

export interface TemplateConfig {
  id: TemplateType;
  name: string;
  desc: string;
  accent: string;
  icon: string;
  screenBg: string;
  screenBgDark: string;
  headerBg: string;
  headerBgDark: string;
  headerNameSize: string;
  headerShowSubtitle: boolean;
  headerShowRating: boolean;
  catStyle: CategoryStyle;
  cardRadius: string;
  cardBorder: string;
  cardBorderDark: string;
  cardShadow: string;
  cardBg: string;
  cardBgDark: string;
  cardImageRadius: string;
  cardOverlayText: boolean;
  btnRadius: string;
  btnStyle: ButtonStyle;
  navStyle: NavStyle;
  navPlacement: NavPlacement;
  featuredStyle: FeaturedStyle;
  headerStyle: HeaderStyle;
  cardStyle: CardStyle;
  searchStyle: SearchStyle;
  priceStyle: PriceStyle;
  statsStyle: StatsStyle;
  tags: string[];
  isNew?: boolean;
  forceDark?: boolean;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "aether", name: "Aether Flow", desc: "Glass gradients, floating controls, airy spacing", accent: "#00d4ff", icon: "🫧",
    tags: ["Liquid Glass", "Future Retail"],
    screenBg: "bg-gradient-to-b from-cyan-50 via-sky-50 to-white", screenBgDark: "bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900",
    headerBg: "bg-gradient-to-r from-cyan-500 to-sky-600", headerBgDark: "bg-gradient-to-r from-cyan-900 to-sky-950",
    headerNameSize: "text-xl", headerShowSubtitle: true, headerShowRating: true,
    catStyle: "chip", cardRadius: "rounded-3xl", cardBorder: "border border-cyan-100/60",
    cardBorderDark: "border border-cyan-500/20", cardShadow: "shadow-xl shadow-cyan-100/60 hover:shadow-2xl hover:shadow-cyan-200/40",
    cardBg: "bg-white/90", cardBgDark: "bg-slate-900/80", cardImageRadius: "rounded-2xl",
    cardOverlayText: false, btnRadius: "rounded-2xl", btnStyle: "gradient",
    navStyle: "pill", navPlacement: "floating", featuredStyle: "wave",
    headerStyle: "glass", cardStyle: "elevated", searchStyle: "pill", priceStyle: "chip", statsStyle: "glass",
    isNew: true,
  },
  {
    id: "brutal", name: "Brutal Terminal", desc: "Hard edges, high contrast, command-center mood", accent: "#ff5a1f", icon: "🧱",
    tags: ["Brutalist UI", "Dark Ops"],
    screenBg: "bg-zinc-950", screenBgDark: "bg-black",
    headerBg: "bg-zinc-950 border-b-2 border-orange-500", headerBgDark: "bg-black border-b-2 border-orange-500",
    headerNameSize: "text-lg", headerShowSubtitle: false, headerShowRating: true,
    catStyle: "block", cardRadius: "rounded-none", cardBorder: "border-2 border-zinc-800",
    cardBorderDark: "border-2 border-zinc-700", cardShadow: "shadow-[6px_6px_0px_0px_rgba(249,115,22,0.25)] hover:shadow-[8px_8px_0px_0px_rgba(249,115,22,0.35)]",
    cardBg: "bg-zinc-900", cardBgDark: "bg-black", cardImageRadius: "rounded-none",
    cardOverlayText: false, btnRadius: "rounded-none", btnStyle: "bold",
    navStyle: "block", navPlacement: "side", featuredStyle: "badge",
    headerStyle: "split", cardStyle: "brutal", searchStyle: "terminal", priceStyle: "tag", statsStyle: "tiles",
    forceDark: true, isNew: true,
  },
];

/** Look up template config by ID. Falls back to first available template. */
export const getTemplate = (id: string): TemplateConfig =>
  TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
