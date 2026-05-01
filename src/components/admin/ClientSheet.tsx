/**
 * ClientSheet.tsx  –  Client 360° side-panel
 * Full client management: overview, chat, designs, live preview, brand kit, notes
 */
import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Client, SavedDesign, PricingRequest } from "@/types/dashboard";
import ClientMasterModal from "@/components/admin/ClientMasterModal";
import {
  useClientSheetData,
} from "@/components/admin/client-sheet/useClientSheetData";
import {
  BarChart2, MessageSquare, Smartphone, Palette, StickyNote, Monitor,
  Edit3, Trash2, TrendingUp, Package, CheckCircle, Eye, Copy, Archive,
  Send, Save, Globe, Star, Link, ShieldCheck, CalendarDays, AlertTriangle,
  RefreshCw, ExternalLink, ChevronLeft, ChevronRight, X, Zap, Plus, FileText,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
type SheetTab = "overview" | "messages" | "designs" | "preview" | "brand" | "notes";

/* ── Small atoms ─────────────────────────────────────────────── */
const statusColor = (s?: string) =>
  s === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    s === "completed" ? "bg-blue-100 text-blue-700 border-blue-200" :
      s === "pending" ? "bg-amber-100 text-amber-700 border-amber-200" :
        "bg-slate-100 text-slate-500 border-slate-200";

const Pill = ({ label, color }: { label: string; color?: string }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${color || statusColor(label.toLowerCase())}`}>
    {label}
  </span>
);

const SCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>{children}</div>
);

/* ── Props ───────────────────────────────────────────────────── */
interface Props {
  client: Client | null;
  designs: SavedDesign[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ClientSheet({ client, designs, open, onOpenChange, onRefresh, onDelete }: Props) {
  const [tab, setTab] = useState<SheetTab>("overview");
  const [masterOpen, setMasterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const {
    messages,
    msgLoading,
    newMsg,
    setNewMsg,
    sending,
    msgEndRef,
    profile,
    pricingRequests,
    clientUpdates,
    clientAssets,
    clientOrders,
    insightsLoading,
    progress,
    setProgress,
    nextSteps,
    setNextSteps,
    adminNotes,
    setAdminNotes,
    savingNotes,
    packageName,
    setPackageName,
    offerLink,
    setOfferLink,
    savingPackageControl,
    previewUrl,
    iframeKey,
    sendMessage,
    saveNotes,
    savePackageControl,
    copyPreviewLink,
    reloadIframe,
  } = useClientSheetData({ client, designs, open, tab, onRefresh });

  // Derived values — safe to compute before hooks using optional chaining
  const clientDesigns = client ? designs.filter(d => d.client_id === client.id) : [];
  const displayName = client?.company_name || client?.username || "";

  useEffect(() => {
    if (open && client) setTab("overview");
  }, [open, client]);

  // Guard: must be AFTER all hooks
  if (!client) return null;

  const handleDeleteConfirmed = () => {
    onDelete(client.id);
    setDeleteConfirm(false);
    onOpenChange(false);
  };

  /* ── Tab config ─────────────────────────────────────────────── */
  const TABS: { id: SheetTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    {
      id: "messages", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" />,
      badge: messages.filter(m => m.sender === "client" && !m.is_read).length
    },
    { id: "designs", label: "Designs", icon: <Smartphone className="w-3.5 h-3.5" />, badge: clientDesigns.length },
    { id: "preview", label: "Live Preview", icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: "brand", label: "Brand Kit", icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "notes", label: "Notes", icon: <StickyNote className="w-3.5 h-3.5" /> },
  ];

  const latestPricingRequest = pricingRequests[0] || null;
  const latestUpdate = clientUpdates[0] || null;
  const latestAsset = clientAssets[0] || null;
  const lastClientMessage = [...messages].reverse().find(message => message.sender === "client") || null;
  const clientRevenue = clientOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
  const approvedPricingCount = pricingRequests.filter(request => request.status === "approved" || request.status === "converted").length;
  const latestOrder = clientOrders[0] || null;
  const recentActivityDates = [
    latestPricingRequest?.updated_at || latestPricingRequest?.created_at || null,
    latestUpdate?.update_date || null,
    latestAsset?.uploaded_at || null,
    lastClientMessage?.created_at || null,
    clientOrders[0]?.created_at || null,
  ].filter(Boolean) as string[];
  const lastActivity = recentActivityDates.length > 0
    ? new Date(recentActivityDates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0])
    : null;
  const healthTone = client.status === "pending"
    ? { label: "Needs Activation", tone: "bg-amber-100 text-amber-700 border-amber-200", note: "Pending setup or review before work accelerates." }
    : latestPricingRequest?.status === "rejected"
      ? { label: "Scope Needs Revision", tone: "bg-rose-100 text-rose-700 border-rose-200", note: "Latest pricing request was rejected and needs a revised scope." }
      : latestPricingRequest?.status === "reviewing"
        ? { label: "In Commercial Review", tone: "bg-cyan-100 text-cyan-700 border-cyan-200", note: "The latest pricing request is still in admin review." }
        : progress >= 80
          ? { label: "Near Completion", tone: "bg-emerald-100 text-emerald-700 border-emerald-200", note: "Delivery looks healthy and close to completion." }
          : { label: "Active Delivery", tone: "bg-indigo-100 text-indigo-700 border-indigo-200", note: "Client is active and progressing through the current package." };
  const timeline = [
    latestPricingRequest ? { id: `pricing-${latestPricingRequest.id}`, title: latestPricingRequest.package_name || `${latestPricingRequest.selected_services.length} scoped items`, meta: `Pricing request · ${latestPricingRequest.status}`, date: latestPricingRequest.updated_at || latestPricingRequest.created_at } : null,
    latestUpdate ? { id: `update-${latestUpdate.id}`, title: latestUpdate.title, meta: `Project update${latestUpdate.type ? ` · ${latestUpdate.type}` : ""}`, date: latestUpdate.update_date } : null,
    latestAsset ? { id: `asset-${latestAsset.id}`, title: latestAsset.file_name, meta: "Asset uploaded", date: latestAsset.uploaded_at } : null,
    clientOrders[0] ? { id: `order-${clientOrders[0].id}`, title: `Order ${clientOrders[0].status}`, meta: `${clientOrders[0].total_price.toLocaleString()} value captured`, date: clientOrders[0].created_at } : null,
    lastClientMessage ? { id: `message-${lastClientMessage.id}`, title: (lastClientMessage.content || lastClientMessage.message || "Client message").slice(0, 72), meta: "Latest client reply", date: lastClientMessage.created_at } : null,
  ].filter(Boolean) as Array<{ id: string; title: string; meta: string; date: string }>;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col bg-slate-50 border-l border-slate-200 overflow-hidden"
        >
          {/* ── HEADER ──────────────────────────────────────────── */}
          <SheetHeader className="flex-shrink-0 p-0">
            <div className={`bg-gradient-to-r ${client.status === "active" ? "from-emerald-600 to-teal-600" :
              client.status === "pending" ? "from-amber-500 to-orange-500" :
                client.status === "suspended" ? "from-rose-600 to-pink-600" :
                  "from-indigo-600 to-violet-600"
              } px-5 pt-5 pb-0`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold text-white shadow flex-shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-bold text-lg leading-tight truncate">{displayName}</h2>
                    <Pill label={(client.status || "N/A").toUpperCase()} color="bg-white/20 text-white border-white/30" />
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">@{client.username}  ·  Joined {new Date(client.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  {client.package_name && (
                    <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-white/15 rounded-lg">
                      <Package className="w-3 h-3 text-white/70" />
                      <span className="text-xs font-semibold text-white/90">{client.package_name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setMasterOpen(true)}
                    className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
                    title="Edit client"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/50 text-white/70 hover:text-white transition-all"
                    title="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 px-1 pb-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/60 font-medium">Project Progress</span>
                  <span className="text-xs font-bold text-white">{progress}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Tab strip */}
              <div className="flex gap-0.5 overflow-x-auto scrollbar-hide -mx-5 px-3">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 flex-shrink-0 ${tab === t.id
                      ? "bg-slate-50 text-slate-800 border-transparent shadow-sm"
                      : "text-white/70 hover:text-white border-transparent hover:bg-white/10"
                      }`}
                  >
                    {t.icon}{t.label}
                    {t.badge !== undefined && t.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === t.id ? "bg-rose-500 text-white" : "bg-white/25 text-white"}`}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </SheetHeader>

          {/* ── BODY ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* ─── OVERVIEW ────────────────────────────────── */}
            {tab === "overview" && (
              <div className="p-5 space-y-4 fade-in">
                {/* Mini stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Package", value: client.package_name || "—", icon: <Package className="w-4 h-4" />, bg: "bg-indigo-50", ic: "text-indigo-500" },
                    { label: "Status", value: client.status || "N/A", icon: <CheckCircle className="w-4 h-4" />, bg: "bg-emerald-50", ic: "text-emerald-500" },
                    { label: "Designs", value: String(clientDesigns.length), icon: <Smartphone className="w-4 h-4" />, bg: "bg-violet-50", ic: "text-violet-500" },
                    { label: "Progress", value: `${progress}%`, icon: <TrendingUp className="w-4 h-4" />, bg: "bg-amber-50", ic: "text-amber-500" },
                  ].map((s, i) => (
                    <SCard key={i} className="p-4">
                      <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2 ${s.ic}`}>{s.icon}</div>
                      <p className="text-xl font-bold text-slate-900 truncate">{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</p>
                    </SCard>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Next Step",
                      value: nextSteps || client.next_steps || "No next step set",
                      sub: "What should happen next",
                      icon: <Zap className="w-4 h-4 text-cyan-500" />,
                      tone: "bg-cyan-50 border-cyan-100",
                    },
                    {
                      label: "Latest Order",
                      value: latestOrder ? `Order ${latestOrder.status}` : "No order yet",
                      sub: latestOrder ? new Date(latestOrder.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Awaiting conversion or first order",
                      icon: <FileText className="w-4 h-4 text-emerald-500" />,
                      tone: "bg-emerald-50 border-emerald-100",
                    },
                    {
                      label: "Current Progress",
                      value: `${progress}%`,
                      sub: progress >= 80 ? "Delivery is close to completion" : "Progress tracked from admin side",
                      icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
                      tone: "bg-amber-50 border-amber-100",
                    },
                    {
                      label: "Commercial State",
                      value: latestPricingRequest?.status || client.status || "No status",
                      sub: latestPricingRequest?.package_name || packageName || client.package_name || "No package attached",
                      icon: <Package className="w-4 h-4 text-indigo-500" />,
                      tone: "bg-indigo-50 border-indigo-100",
                    },
                  ].map((item) => (
                    <SCard key={item.label} className={`p-4 border ${item.tone}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">{item.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-2">{item.value}</p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.sub}</p>
                    </SCard>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
                  <SCard className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-500" /> Client Health & Delivery Signal
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Operational status, commercial state, and latest movement in one place.</p>
                      </div>
                      <Pill label={healthTone.label} color={healthTone.tone} />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Revenue", value: `$${clientRevenue.toLocaleString() || 0}`, sub: `${clientOrders.length} orders`, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, bg: "bg-emerald-50" },
                        { label: "Pricing", value: String(pricingRequests.length), sub: `${approvedPricingCount} approved`, icon: <FileText className="w-4 h-4 text-cyan-500" />, bg: "bg-cyan-50" },
                        { label: "Assets", value: String(clientAssets.length), sub: latestAsset ? latestAsset.file_name : "No files", icon: <Archive className="w-4 h-4 text-violet-500" />, bg: "bg-violet-50" },
                        { label: "Updates", value: String(clientUpdates.length), sub: latestUpdate ? latestUpdate.title : "No updates", icon: <CalendarDays className="w-4 h-4 text-amber-500" />, bg: "bg-amber-50" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>{item.icon}</div>
                          <p className="text-lg font-bold text-slate-900 truncate">{item.value}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mt-1">{item.label}</p>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Activity</p>
                        <span className="text-xs text-slate-400">{lastActivity ? lastActivity.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "No activity yet"}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{healthTone.note}</p>
                    </div>
                  </SCard>

                  <SCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-500" /> Package Command Center
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Direct control over the client package surface before opening the advanced modal.</p>
                      </div>
                      <button
                        onClick={() => setMasterOpen(true)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                      >
                        Advanced Control
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Package Label</label>
                        <input
                          value={packageName}
                          onChange={e => setPackageName(e.target.value)}
                          placeholder="Custom Plan, Growth Retainer, etc."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Active Offer Link</label>
                        <input
                          value={offerLink}
                          onChange={e => setOfferLink(e.target.value)}
                          placeholder="https://offer-or-checkout-link"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current Scope</p>
                        <p className="mt-2 text-sm font-bold text-slate-800">{latestPricingRequest?.package_name || packageName || client.package_name || "No package assigned"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Commercial Status</p>
                        <p className="mt-2 text-sm font-bold text-slate-800 capitalize">{latestPricingRequest?.status || client.status || "n/a"}</p>
                      </div>
                    </div>

                    <button
                      onClick={savePackageControl}
                      disabled={savingPackageControl}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {savingPackageControl ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Package Control
                    </button>
                  </SCard>
                </div>

                {/* Progress editor */}
                <SCard className="p-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Progress & Next Steps
                  </h4>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-slate-400">Completion</span>
                      <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))}
                      className="w-full h-1.5 accent-indigo-600 cursor-pointer rounded-full" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Next Steps</label>
                    <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} rows={3}
                      placeholder="What needs to happen next"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                  </div>
                  <button onClick={saveNotes} disabled={savingNotes}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm">
                    {savingNotes ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Progress
                  </button>
                </SCard>

                <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-4">
                  <SCard className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-500" /> Pricing Request Intelligence
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Commercial history, selected scope, and latest approved totals.</p>
                      </div>
                      <button onClick={() => setMasterOpen(true)} className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors">Manage Package →</button>
                    </div>

                    {insightsLoading ? (
                      <div className="py-10 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                      </div>
                    ) : pricingRequests.length === 0 ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-sm font-semibold text-slate-700">No pricing requests yet</p>
                        <p className="text-xs text-slate-400 mt-1">Once the client submits or edits a pricing request, it will appear here with scope and commercial state.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pricingRequests.slice(0, 3).map((request) => (
                          <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{request.package_name || `${request.selected_services.length} selected services`}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(request.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {request.estimated_total.toLocaleString()} {request.price_currency}</p>
                              </div>
                              <Pill label={request.status} />
                            </div>
                            {request.selected_services.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {request.selected_services.slice(0, 5).map(service => (
                                  <span key={`${request.id}-${service.id}`} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                                    {service.name}
                                  </span>
                                ))}
                                {request.selected_services.length > 5 && (
                                  <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-400">+{request.selected_services.length - 5} more</span>
                                )}
                              </div>
                            )}
                            {request.request_notes && (
                              <p className="text-xs text-slate-500 mt-3 leading-relaxed bg-white rounded-xl border border-slate-100 p-3">{request.request_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </SCard>

                  <SCard className="p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-500" /> Client Activity Timeline
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">Latest operational events across delivery, files, orders, and communication.</p>
                    </div>

                    {timeline.length === 0 ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-sm font-semibold text-slate-700">Timeline is quiet</p>
                        <p className="text-xs text-slate-400 mt-1">No updates, assets, pricing requests, or messages recorded for this client yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timeline.map((item, index) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="flex flex-col items-center pt-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                              {index < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                              <p className="text-xs text-slate-400 mt-1">{item.meta}</p>
                              <p className="text-[11px] text-slate-400 mt-1">{new Date(item.date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SCard>
                </div>

                {/* Package details */}
                {client.package_details && (
                  <SCard className="p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500" /> Package Details
                    </h4>
                    <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-36 overflow-y-auto">
                      {typeof client.package_details === "object"
                        ? JSON.stringify(client.package_details, null, 2)
                        : String(client.package_details)}
                    </pre>
                  </SCard>
                )}

                {/* Active offer */}
                {(client.active_offer || client.active_offer_link) && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Active Offer
                    </h4>
                    <p className="text-sm text-amber-800">{client.active_offer}</p>
                    {client.active_offer_link && (
                      <a href={client.active_offer_link} target="_blank" rel="noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                        <Link className="w-3 h-3" />{client.active_offer_link}
                      </a>
                    )}
                  </div>
                )}

                {/* Quick actions */}
                <SCard className="p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setTab("messages")}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" /> Open Chat
                    </button>
                    <button onClick={() => setTab("preview")}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 text-xs font-semibold transition-colors">
                      <Monitor className="w-3.5 h-3.5" /> Live Preview
                    </button>
                    <button onClick={() => setMasterOpen(true)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Client
                    </button>
                    <button onClick={() => setTab("designs")}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors">
                      <Smartphone className="w-3.5 h-3.5" /> View Designs
                    </button>
                  </div>
                </SCard>
              </div>
            )}

            {/* ─── MESSAGES ────────────────────────────────── */}
            {tab === "messages" && (
              <div className="flex flex-col h-full fade-in" style={{ height: "calc(100vh - 240px)" }}>
                <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2 flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Chat with {displayName}</span>
                  <span className="ml-auto text-xs text-slate-400">{messages.length} messages</span>
                  <button onClick={fetchMessages} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-500 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {msgLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs text-slate-300 mt-1">Send the first message below</p>
                    </div>
                  ) : messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      {m.sender === "client" && (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0 mr-2 self-end">
                          {displayName.charAt(0)}
                        </div>
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.sender === "admin"
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-200"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm"}`}>
                        {m.content || m.message}
                        <p className={`text-[10px] mt-1 ${m.sender === "admin" ? "text-indigo-200" : "text-slate-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>
                <div className="p-3 border-t border-slate-200 bg-white flex gap-2 flex-shrink-0">
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && !sending && sendMessage()}
                    placeholder={`Reply to ${displayName}`}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                  <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2 flex-shrink-0">
                    {sending ? <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ─── DESIGNS ─────────────────────────────────── */}
            {tab === "designs" && (
              <div className="p-4 space-y-3 fade-in">
                {clientDesigns.length === 0 ? (
                  <SCard className="py-20 text-center">
                    <Smartphone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No saved designs yet</p>
                    <p className="text-slate-300 text-xs mt-1">Designs saved via the Live Preview tool appear here</p>
                    <button onClick={() => setTab("preview")}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold mx-auto transition-colors">
                      <Monitor className="w-3.5 h-3.5" /> Open Live Preview
                    </button>
                  </SCard>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clientDesigns.map(d => (
                      <SCard key={d.id} className="overflow-hidden">
                        {/* Design header */}
                        <div className="p-4 border-b border-slate-50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center flex-shrink-0 text-base">
                                {d.service_type === "restaurant" ? "🍽️" : d.service_type === "cafe" ? "☕" : d.service_type === "salon" ? "✂️" : d.service_type === "pharmacy" ? "💊" : "🏪"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{d.business_name}</p>
                                <p className="text-xs text-slate-400 capitalize mt-0.5">{d.service_type} · {d.selected_template}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase flex-shrink-0 ${d.status === "featured" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              d.status === "archived" ? "bg-slate-100 text-slate-500 border-slate-200" :
                                "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>{d.status}</span>
                          </div>
                          {/* Tags */}
                          <div className="flex gap-1.5 mt-2.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-600 font-medium">{d.selected_theme}</span>
                            {d.is_dark_mode && <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-medium">🌙 Dark</span>}
                            {d.glass_effect && <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-[10px] text-blue-600 font-medium">✨ Glass</span>}
                            <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" /> {d.view_count || 0}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="px-3 py-3 flex gap-2">
                          <a href={`/demo?id=${d.id}`}
                            target="_blank" rel="noreferrer"
                            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Preview Design
                          </a>
                          <button
                            onClick={() => {
                              setPreviewUrl(`${window.location.origin}/demo?id=${d.id}`);
                              setTab("preview");
                              setIframeKey(k => k + 1);
                            }}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-all text-xs font-bold flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/demo?id=${d.id}`).then(() => toast.success("Link copied!"))}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </SCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── LIVE PREVIEW ─────────────────────────────── */}
            {tab === "preview" && (
              <div className="flex flex-col h-full fade-in" style={{ minHeight: "calc(100vh - 260px)" }}>
                {/* Controls bar */}
                <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="flex gap-1 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 mx-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-500 truncate font-mono">{previewUrl}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={copyPreviewLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all">
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <a href={previewUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                    <button onClick={reloadIframe}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Design selector (if multiple designs) */}
                {clientDesigns.length > 1 && (
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto scrollbar-hide">
                    {clientDesigns.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setPreviewUrl(`${window.location.origin}/demo?id=${d.id}`);
                          setIframeKey(k => k + 1);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all whitespace-nowrap flex-shrink-0"
                      >
                        <Smartphone className="w-3 h-3" /> {d.business_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Iframe */}
                <div className="flex-1 relative bg-slate-100">
                  <iframe
                    key={iframeKey}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    style={{ minHeight: "calc(100vh - 340px)" }}
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>

                {/* Magic link generator */}
                <div className="p-3 bg-white border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" /> Client Access Link
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 truncate font-mono">
                      {window.location.origin}/client/login?ref={client.username}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/client/login?ref=${client.username}`); toast.success("Client login link copied!"); }}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── BRAND KIT ───────────────────────────────── */}
            {tab === "brand" && (
              <div className="p-4 space-y-4 fade-in">
                {!profile ? (
                  <SCard className="py-16 text-center">
                    <Palette className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No brand profile set up yet</p>
                    <p className="text-slate-300 text-xs mt-1">Client needs to fill in their brand settings</p>
                    <button onClick={fetchProfile}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold mx-auto transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  </SCard>
                ) : (
                  <>
                    <SCard className="p-5">
                      <div className="flex items-center gap-4 mb-4">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-2xl font-bold text-indigo-700">
                            {displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-bold text-slate-900">{profile.display_name || displayName}</p>
                          {profile.tagline && <p className="text-xs text-slate-400 mt-0.5">{profile.tagline}</p>}
                          {profile.website && (
                            <a href={profile.website} target="_blank" rel="noreferrer"
                              className="text-xs text-indigo-500 flex items-center gap-1 mt-1 hover:text-indigo-700 transition-colors">
                              <Globe className="w-3 h-3" />{profile.website}
                            </a>
                          )}
                        </div>
                      </div>
                      {profile.bio && (
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-100 leading-relaxed">{profile.bio}</p>
                      )}
                    </SCard>

                    {profile.brand_colors && profile.brand_colors.length > 0 && (
                      <SCard className="p-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Brand Colors</h4>
                        <div className="flex gap-4 flex-wrap">
                          {profile.brand_colors.map((c, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200" style={{ background: c }} />
                              <p className="text-[10px] text-slate-400 font-mono">{c}</p>
                            </div>
                          ))}
                          {profile.theme_accent && (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200" style={{ background: profile.theme_accent }} />
                              <p className="text-[10px] text-slate-400 font-mono">Accent</p>
                            </div>
                          )}
                        </div>
                      </SCard>
                    )}

                    {profile.cover_gradient && (
                      <SCard className="p-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Cover Gradient</h4>
                        <div className={`h-20 rounded-2xl bg-gradient-to-r ${profile.cover_gradient} shadow-sm`} />
                      </SCard>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ─── NOTES ───────────────────────────────────── */}
            {tab === "notes" && (
              <div className="p-4 space-y-4 fade-in">
                <SCard className="p-5">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500" /> Admin Notes
                  </h4>
                  <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={6}
                    placeholder="Internal notes about this client (not visible to client)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                </SCard>

                <SCard className="p-5">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Next Steps
                  </h4>
                  <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} rows={4}
                    placeholder="Next action items for this client"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                </SCard>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3">
                  <SCard className="p-4">
                    <div className="flex items-center gap-2 mb-1.5"><CalendarDays className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400 font-medium">Client Since</p></div>
                    <p className="text-sm font-bold text-slate-800">{new Date(client.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </SCard>
                  <SCard className="p-4">
                    <div className="flex items-center gap-2 mb-1.5"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400 font-medium">Security Q&A</p></div>
                    <p className="text-sm font-bold text-slate-800">{client.security_question ? "✅ Set" : "⚠️ Not set"}</p>
                  </SCard>
                </div>

                <button onClick={saveNotes} disabled={savingNotes}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 shadow-sm">
                  {savingNotes ? <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save All Notes
                </button>
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>

      {/* Edit modal */}
      {masterOpen && client && (
        <ClientMasterModal
          client={client}
          open={masterOpen}
          onOpenChange={setMasterOpen}
          onUpdate={() => { onRefresh(); setMasterOpen(false); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="bg-white border-slate-200 max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <AlertDialogTitle className="text-slate-900 text-lg">Delete Client</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-400 text-sm ml-[52px] leading-relaxed">
              Permanently delete <strong className="text-slate-700">{displayName}</strong>? This will remove all their data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Delete Client</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .fade-in { animation: fadeUp 0.2s ease-out; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
