import { motion } from "framer-motion";
import {
    LayoutGrid, Navigation, MousePointer,
} from "lucide-react";
import type { T1CardStyle, T1NavStyle, T1ButtonStyle } from "../../templates/Template1Screen";

interface TemplateTabProps {
    cardStyle: T1CardStyle;
    setCardStyle: (v: T1CardStyle) => void;
    navStyle: T1NavStyle;
    setNavStyle: (v: T1NavStyle) => void;
    buttonStyle: T1ButtonStyle;
    setButtonStyle: (v: T1ButtonStyle) => void;
    accent: string;
}

const CARD_STYLES: { id: T1CardStyle; label: string; preview: string }[] = [
    { id: "elevated", label: "Elevated", preview: "shadow-md border bg-white" },
    { id: "flat", label: "Flat", preview: "border bg-white" },
    { id: "outlined", label: "Outlined", preview: "border-2 border-slate-400 bg-transparent" },
    { id: "glass", label: "Glass", preview: "bg-white/40 backdrop-blur border border-white/50" },
    { id: "neo", label: "Neo", preview: "bg-slate-100 shadow-[2px_2px_4px_#d1d5db,-2px_-2px_4px_#fff]" },
    { id: "brutal", label: "Brutal", preview: "border-2 border-slate-900 shadow-[2px_2px_0px_0px] shadow-slate-900 bg-white" },
    { id: "gradient", label: "Gradient", preview: "border bg-gradient-to-br from-cyan-50 to-blue-50" },
    { id: "minimal", label: "Minimal", preview: "bg-transparent" },
];

const BUTTON_STYLES: { id: T1ButtonStyle; label: string }[] = [
    { id: "rounded", label: "Rounded" },
    { id: "pill", label: "Pill" },
    { id: "square", label: "Square" },
    { id: "ghost", label: "Ghost" },
    { id: "gradient", label: "Gradient" },
    { id: "glow", label: "Glow" },
    { id: "soft", label: "Soft" },
    { id: "bold", label: "Bold" },
];

const TemplateTab = ({
    cardStyle, setCardStyle,
    navStyle, setNavStyle,
    buttonStyle, setButtonStyle,
    accent,
}: TemplateTabProps) => {
    return (
        <motion.div
            key="template-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
        >
            {/* Card Style */}
            <div>
                <div className="flex items-center gap-2 mb-2.5">
                    <LayoutGrid className="w-3.5 h-3.5" style={{ color: accent }} />
                    <span className="text-xs font-bold text-foreground">Card Style</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {CARD_STYLES.map(cs => {
                        const active = cardStyle === cs.id;
                        return (
                            <button
                                key={cs.id}
                                onClick={() => setCardStyle(cs.id)}
                                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${active ? "border-transparent" : "border-slate-200 hover:border-slate-300"}`}
                                style={active ? { outline: `2px solid ${accent}`, outlineOffset: '-1px', borderColor: accent } : {}}
                            >
                                <div className={`w-full h-6 rounded ${cs.preview}`} />
                                <span className={`text-[8px] font-bold ${active ? "" : "text-muted-foreground"}`} style={active ? { color: accent } : {}}>
                                    {cs.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Button Style */}
            <div>
                <div className="flex items-center gap-2 mb-2.5">
                    <MousePointer className="w-3.5 h-3.5" style={{ color: accent }} />
                    <span className="text-xs font-bold text-foreground">Button Style</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {BUTTON_STYLES.map(bs => {
                        const active = buttonStyle === bs.id;
                        const getPreviewClass = () => {
                            switch (bs.id) {
                                case "rounded": return "rounded-md";
                                case "pill": return "rounded-full";
                                case "square": return "rounded-none";
                                case "ghost": return "rounded-md border border-current bg-transparent";
                                case "gradient": return "rounded-md";
                                case "glow": return "rounded-md";
                                case "soft": return "rounded-lg";
                                case "bold": return "rounded-md";
                                default: return "rounded-md";
                            }
                        };
                        return (
                            <button
                                key={bs.id}
                                onClick={() => setButtonStyle(bs.id)}
                                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${active ? "border-transparent" : "border-slate-200 hover:border-slate-300"}`}
                                style={active ? { outline: `2px solid ${accent}`, outlineOffset: '-1px', borderColor: accent } : {}}
                            >
                                <div
                                    className={`w-full h-4 ${getPreviewClass()}`}
                                    style={{
                                        background: bs.id === "ghost" ? "transparent" : bs.id === "soft" ? accent + "25" : accent,
                                        ...(bs.id === "glow" ? { boxShadow: `0 0 8px ${accent}60` } : {}),
                                        ...(bs.id === "ghost" ? { borderColor: accent, color: accent } : {}),
                                    }}
                                />
                                <span className={`text-[8px] font-bold ${active ? "" : "text-muted-foreground"}`} style={active ? { color: accent } : {}}>
                                    {bs.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export default TemplateTab;
