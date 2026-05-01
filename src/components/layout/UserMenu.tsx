/**
 * ═══════════════════════════════════════════════════════════════════
 * UserMenu.tsx — PORTAL-BASED USER MENU (BULLETPROOF)
 * ═══════════════════════════════════════════════════════════════════
 *
 * This component renders via React Portal directly into document.body,
 * completely bypassing the navbar's DOM hierarchy and any stacking
 * context / z-index / overflow / backdrop-blur issues.
 *
 * ✅ No `absolute` positioning relative to parents
 * ✅ No `backdrop-blur` (solid background only)
 * ✅ `fixed` positioning relative to the viewport
 * ✅ Transparent backdrop catches outside clicks
 * ✅ Escape key closes the menu
 * ✅ Works identically on desktop and mobile
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LayoutDashboard, Crown, Settings, LogOut, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
interface UserMenuProps {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: RefObject<HTMLButtonElement | HTMLDivElement | null>;
    client: {
        display_name?: string;
        company_name?: string;
        username?: string;
    } | null;
    isAdmin: boolean;
    onNavigate: (path: string) => void;
    onLogout: () => void;
    onPricingOpen: () => void;
}

// ─── Position calculator ─────────────────────────────────────────
function useMenuPosition(
    triggerRef: RefObject<HTMLElement | null>,
    isOpen: boolean
) {
    const [pos, setPos] = useState({ top: 0, right: 0 });

    const recalc = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({
            top: rect.bottom + 10, // 10px gap below trigger
            right: window.innerWidth - rect.right, // align right edge
        });
    }, [triggerRef]);

    useEffect(() => {
        if (!isOpen) return;
        recalc();
        // Recalculate on scroll/resize so the menu tracks the trigger
        window.addEventListener("scroll", recalc, true);
        window.addEventListener("resize", recalc);
        return () => {
            window.removeEventListener("scroll", recalc, true);
            window.removeEventListener("resize", recalc);
        };
    }, [isOpen, recalc]);

    return pos;
}

// ─── Component ───────────────────────────────────────────────────
const UserMenu = ({
    isOpen,
    onClose,
    triggerRef,
    client,
    isAdmin,
    onNavigate,
    onLogout,
    onPricingOpen,
}: UserMenuProps) => {
    const pos = useMenuPosition(triggerRef, isOpen);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const displayName =
        client?.display_name || client?.company_name || client?.username || "User";
    const initial = displayName.charAt(0).toUpperCase();

    const handleAction = (action: () => void) => {
        onClose();
        action();
    };

    const menuContent = (
        <>
            {/* ── Invisible full-screen backdrop ── */}
            <div
                className="fixed inset-0"
                style={{ zIndex: 99998 }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* ── Menu panel ── */}
            <div
                className="fixed w-64 sm:w-72 animate-usermenu-in"
                style={{
                    zIndex: 99999,
                    top: `${pos.top}px`,
                    right: `${pos.right}px`,
                }}
            >
                <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
                    {/* ── Profile header ── */}
                    <button
                        onClick={() =>
                            handleAction(() =>
                                onNavigate(isAdmin ? "/admin/profile" : "/clients/profile")
                            )
                        }
                        className="w-full px-4 pt-4 pb-3 border-b border-slate-700/60 hover:bg-slate-800/60 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64ffda]/20 to-cyan-400/10 border border-[#64ffda]/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-[#64ffda]">
                                    {initial}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {displayName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${isAdmin ? "bg-amber-400" : "bg-[#64ffda]"
                                            }`}
                                    />
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {isAdmin ? "Admin" : "Client"}
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                    </button>

                    {/* ── Menu items ── */}
                    <nav className="py-1.5 px-1.5" role="menu">
                        <button
                            role="menuitem"
                            onClick={() =>
                                handleAction(() =>
                                    onNavigate(isAdmin ? "/dashboard" : "/clients/profile")
                                )
                            }
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150 group"
                        >
                            <LayoutDashboard className="w-4 h-4 text-[#64ffda]/70 group-hover:text-[#64ffda] transition-colors" />
                            <span className="text-sm font-medium">Dashboard</span>
                        </button>

                        <button
                            role="menuitem"
                            onClick={() => handleAction(onPricingOpen)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150 group"
                        >
                            <Crown className="w-4 h-4 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
                            <span className="text-sm font-medium">Plans & Pricing</span>
                        </button>

                        <button
                            role="menuitem"
                            onClick={() =>
                                handleAction(() =>
                                    onNavigate(isAdmin ? "/admin/profile" : "/clients/profile")
                                )
                            }
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150 group"
                        >
                            <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                            <span className="text-sm font-medium">My Profile</span>
                        </button>
                    </nav>

                    {/* ── Sign out ── */}
                    <div className="px-1.5 pb-1.5 pt-0.5">
                        <div className="border-t border-slate-700/60 pt-1.5">
                            <button
                                role="menuitem"
                                onClick={() => handleAction(onLogout)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-medium">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    // Render via portal — completely outside navbar DOM tree
    return createPortal(menuContent, document.body);
};

export default UserMenu;

