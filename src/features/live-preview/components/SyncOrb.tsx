/**
 * SyncOrb — Live Syncing Indicator
 * ──────────────────────────────────────
 * A glowing orb that pulses while saving and shows
 * a small "Live Syncing…" / "Saved" label next to it.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Cloud } from "lucide-react";

interface SyncOrbProps {
    isSaving: boolean;
    lastSavedAt: Date | null;
    isAuthenticated: boolean;
    effectiveAccent: string;
}

const SyncOrb = ({ isSaving, lastSavedAt, isAuthenticated, effectiveAccent }: SyncOrbProps) => {
    if (!isAuthenticated) return null;

    const label = isSaving
        ? "Syncing…"
        : lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : null;

    if (!label) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={label}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1.5"
            >
                {isSaving ? (
                    /* Pulsing orb while syncing */
                    <span
                        className="relative flex h-2 w-2"
                    >
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                            style={{ background: effectiveAccent }}
                        />
                        <span
                            className="relative inline-flex rounded-full h-2 w-2"
                            style={{ background: effectiveAccent }}
                        />
                    </span>
                ) : (
                    <Check className="w-3 h-3" style={{ color: effectiveAccent }} />
                )}
                <span
                    className="text-[10px] font-medium"
                    style={{ color: isSaving ? effectiveAccent : `${effectiveAccent}99` }}
                >
                    {label}
                </span>
            </motion.div>
        </AnimatePresence>
    );
};

export default SyncOrb;
