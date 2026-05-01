/**
 * ClientMasterModal.tsx  Admin Client Management Modal (Clean Light Theme)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import {
  User, Package, Image, MessageSquare,
  Copy, Save, RefreshCw, Key, Send,
  Paperclip, ExternalLink, RotateCcw,
  Star, ChevronRight, Smartphone, CheckCircle, FileText, TrendingUp,
} from "lucide-react";
import { Client, PricingRequest } from "@/types/dashboard";
import {
  adminInsertClientUpdate,
  adminRecordAsset,
  adminSendMessage,
  adminUpdateClient,
  adminUpdatePricingRequest,
  fetchAdminClientModalSnapshot,
} from "@/services/adminClientModalService";

/*  Types  */
interface MetricItem { label: string; used: number; total: number; }
interface PlanConfig {
  posts: MetricItem; reels: MetricItem; stories: MetricItem; designs: MetricItem;
  monthly_fee?: number; billing_cycle?: string;
}
interface PackageOption { id: string; name: string; price: number; }
interface ChatMessage { id: string; sender: "admin" | "client"; message: string; content?: string; created_at: string; }
interface StudioProject { id: string; business_name: string; service_type: string; selected_theme: string; selected_template: string; is_dark_mode: boolean; status: string; created_at: string; }
interface ClientUpdateRow { id: string; title: string; type?: string; update_date: string; }

const DEFAULT_PLAN: PlanConfig = {
  posts: { label: "Posts", used: 0, total: 10 },
  reels: { label: "Reels", used: 0, total: 4 },
  stories: { label: "Stories", used: 0, total: 20 },
  designs: { label: "Designs", used: 0, total: 5 },
  monthly_fee: 0,
  billing_cycle: "monthly",
};

interface Props { client: Client; open: boolean; onOpenChange: (o: boolean) => void; onUpdate?: () => void; }

type ModalTab = "identity" | "subscription" | "assets" | "comms";

/*  Helpers  */
const ProgressBar = ({ used, total }: { used: number; total: number }) => {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? "bg-rose-400" : pct >= 70 ? "bg-amber-400" : "bg-gradient-to-r from-indigo-400 to-violet-400"}`}
        style={{ width: `${pct}%` }} />
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props}
    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all disabled:opacity-50 disabled:bg-slate-100 ${props.className || ""}`} />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props}
    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all disabled:opacity-50 ${props.className || ""}`} />
);

/*  Main  */
export default function ClientMasterModal({ client, open, onOpenChange, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>("identity");
  const [loading, setLoading] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* identity */
  const [profileData, setProfileData] = useState({ company_name: client.company_name || "", username: client.username || "", status: client.status || "active" });

  /* subscription */
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_PLAN);
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [packageName, setPackageName] = useState(client.package_name || "");
  const [activeOffer, setActiveOffer] = useState(client.active_offer || "");
  const [activeOfferLink, setActiveOfferLink] = useState(client.active_offer_link || "");
  const [packageDetailsSummary, setPackageDetailsSummary] = useState("");
  const [clientStatus, setClientStatus] = useState(client.status || "active");
  const [clientProgress, setClientProgress] = useState(client.progress ?? 0);
  const [clientNextSteps, setClientNextSteps] = useState(client.next_steps || "");
  const [pricingRequests, setPricingRequests] = useState<PricingRequest[]>([]);
  const [clientUpdates, setClientUpdates] = useState<ClientUpdateRow[]>([]);

  /* assets */
  const initialBrandColors = Array.isArray((client as unknown as { brand_colors?: unknown }).brand_colors)
    ? (((client as unknown as { brand_colors?: unknown }).brand_colors as unknown[])?.filter(x => typeof x === "string") as string[])
    : [];
  const initialPrimary = (client as unknown as { theme_accent?: string }).theme_accent
    || initialBrandColors[0]
    || "#6366f1";
  const initialSecondary = initialBrandColors[1] || "#8b5cf6";
  const [brandConfig, setBrandConfig] = useState({
    logo_url: (client as unknown as { logo_url?: string }).logo_url || "",
    primary_color: initialPrimary,
    secondary_color: initialSecondary,
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [studioProjects, setStudioProjects] = useState<StudioProject[]>([]);

  /* comms */
  const [adminNotes, setAdminNotes] = useState(client.admin_notes || "");
  const [clientMessages, setClientMessages] = useState<ChatMessage[]>([]);
  const [newAdminMessage, setNewAdminMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  /*  Load  */
  const loadSnapshot = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    const subscription = (data.subscription || null) as Record<string, unknown> | null;
    const snapshotPackages = (data.packages || []) as PackageOption[];
    const snapshotMessages = (data.messages || []) as ChatMessage[];
    const snapshotProjects = (data.projects || []) as StudioProject[];
    const snapshotPricing = (data.pricingRequests || []) as PricingRequest[];
    const snapshotUpdates = (data.updates || []) as ClientUpdateRow[];

    setPackages(snapshotPackages);
    setClientMessages(snapshotMessages);
    setStudioProjects(snapshotProjects);
    setPricingRequests(snapshotPricing);
    setClientUpdates(snapshotUpdates);

    if (!subscription) return;

    const subscriptionConfig = subscription.subscription_config as Record<string, unknown> | undefined;
    if (subscriptionConfig) {
      const sc = subscriptionConfig;
      const merged: PlanConfig = { ...DEFAULT_PLAN };
      (["posts", "reels", "stories", "designs"] as const).forEach(k => {
        if (sc[k] && typeof sc[k] === "object") merged[k] = { ...merged[k], ...(sc[k] as object) };
      });
      if (sc.monthly_fee !== undefined) merged.monthly_fee = Number(sc.monthly_fee);
      if (sc.billing_cycle !== undefined) merged.billing_cycle = String(sc.billing_cycle);
      setPlanConfig(merged);
    }

    if (subscription.package_name) setPackageName(String(subscription.package_name));
    if (subscription.active_offer) setActiveOffer(String(subscription.active_offer));
    if (subscription.active_offer_link) setActiveOfferLink(String(subscription.active_offer_link));
    if (subscription.status) setClientStatus(String(subscription.status));
    if (typeof subscription.progress === "number") setClientProgress(Number(subscription.progress));
    if (subscription.next_steps) setClientNextSteps(String(subscription.next_steps));
    if (subscription.package_details) {
      const details = subscription.package_details as Record<string, unknown>;
      setPackageDetailsSummary(typeof details.summary === "string" ? details.summary : JSON.stringify(details, null, 2));
    }
  }, [client.id]);

  const loadSubscription = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    const subscription = (data.subscription || null) as Record<string, unknown> | null;
    if (!subscription) return;

    const subscriptionConfig = subscription.subscription_config as Record<string, unknown> | undefined;
    if (subscriptionConfig) {
      const sc = subscriptionConfig;
      const merged: PlanConfig = { ...DEFAULT_PLAN };
      (["posts", "reels", "stories", "designs"] as const).forEach(k => {
        if (sc[k] && typeof sc[k] === "object") merged[k] = { ...merged[k], ...(sc[k] as object) };
      });
      if (sc.monthly_fee !== undefined) merged.monthly_fee = Number(sc.monthly_fee);
      if (sc.billing_cycle !== undefined) merged.billing_cycle = String(sc.billing_cycle);
      setPlanConfig(merged);
    }

    if (subscription.package_name) setPackageName(String(subscription.package_name));
    if (subscription.active_offer) setActiveOffer(String(subscription.active_offer));
    if (subscription.active_offer_link) setActiveOfferLink(String(subscription.active_offer_link));
    if (subscription.status) setClientStatus(String(subscription.status));
    if (typeof subscription.progress === "number") setClientProgress(Number(subscription.progress));
    if (subscription.next_steps) setClientNextSteps(String(subscription.next_steps));
    if (subscription.package_details) {
      const details = subscription.package_details as Record<string, unknown>;
      setPackageDetailsSummary(typeof details.summary === "string" ? details.summary : JSON.stringify(details, null, 2));
    }
  }, [client.id]);

  const loadPackages = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    setPackages((data.packages || []) as PackageOption[]);
  }, [client.id]);

  const loadMessages = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    setClientMessages((data.messages || []) as ChatMessage[]);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [client.id]);

  const loadStudioProjects = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    setStudioProjects((data.projects || []) as StudioProject[]);
  }, [client.id]);

  const loadPricingRequests = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    setPricingRequests((data.pricingRequests || []) as PricingRequest[]);
  }, [client.id]);

  const loadClientUpdates = useCallback(async () => {
    const data = await fetchAdminClientModalSnapshot(client.id);
    setClientUpdates((data.updates || []) as ClientUpdateRow[]);
  }, [client.id]);

  const recordCommercialUpdate = useCallback(async (title: string, type: ClientUpdateRow["type"] = "action") => {
    await adminInsertClientUpdate({
      client_id: client.id,
      title,
      type: type || "action",
      update_date: new Date().toISOString(),
    });
  }, [client.id]);

  useEffect(() => {
    if (!open) return;
    loadSnapshot();
    const channel = supabase.channel(`admin-chat-${client.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_messages", filter: `client_id=eq.${client.id}` },
        () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, client.id, loadMessages, loadSnapshot]);

  /*  Handlers  */
  const handleUpdateProfile = async () => {
    setLoading(true);
    let error: unknown = null;
    try {
      await adminUpdateClient(client.id, {
        company_name: profileData.company_name,
        username: profileData.username,
        status: profileData.status,
      });
    } catch (err) {
      error = err;
    }
    setLoading(false);
    if (error) {
      toast.error("Update failed");
      return;
    }
    toast.success("Profile updated!");
    onUpdate?.();
  };

  const handleResetPassword = async () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const newPwd = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    try {
      await adminUpdateClient(client.id, { temp_password: newPwd });
      navigator.clipboard.writeText(newPwd);
      toast.success(`Password reset: ${newPwd} (copied)`);
    } catch {
      toast.error("Reset failed");
    }
  };

  const handleSavePlan = async () => {
    const selectedPackage = packages.find(pkg => pkg.id === packageName || pkg.name === packageName);
    const packageDetails = {
      source: isCustomPlan ? "custom_plan" : "package",
      package_name: selectedPackage?.name || packageName || null,
      offer: activeOffer || null,
      offer_link: activeOfferLink || null,
      progress: clientProgress,
      next_steps: clientNextSteps || null,
      summary: packageDetailsSummary || null,
      subscription_config: planConfig,
      latest_pricing_request_id: pricingRequests[0]?.id || null,
      latest_pricing_status: pricingRequests[0]?.status || null,
      latest_pricing_total: pricingRequests[0]?.estimated_total || null,
    };

    try {
      await adminUpdateClient(client.id, {
        package_name: selectedPackage?.name || packageName || null,
        status: clientStatus,
        progress: clientProgress,
        next_steps: clientNextSteps,
        subscription_config: planConfig,
        active_offer: activeOffer,
        active_offer_link: activeOfferLink,
        package_details: packageDetails,
      });
    } catch {
      toast.error("Save failed");
      return;
    }

    await recordCommercialUpdate(`Package control updated to ${selectedPackage?.name || packageName || "custom plan"}`);
    toast.success("Plan saved!");
    loadClientUpdates();
    onUpdate?.();
  };

  const handleResetCycle = () => {
    setPlanConfig(prev => ({
      ...prev,
      posts: { ...prev.posts, used: 0 },
      reels: { ...prev.reels, used: 0 },
      stories: { ...prev.stories, used: 0 },
      designs: { ...prev.designs, used: 0 },
    }));
    toast.success("Cycle reset (save to apply)");
  };

  const handleSaveOffer = async () => {
    try {
      await adminUpdateClient(client.id, { active_offer: activeOffer, active_offer_link: activeOfferLink });
    } catch {
      toast.error("Save failed");
      return;
    }

    await recordCommercialUpdate(`Offer updated${activeOffer ? `: ${activeOffer}` : ""}`);
    toast.success("Offer saved!");
    loadClientUpdates();
  };

  const updatePricingRequestStatus = async (request: PricingRequest, nextStatus: PricingRequest["status"]) => {
    const payload: Record<string, unknown> = { status: nextStatus };
    if (nextStatus !== "new") payload.reviewed_at = new Date().toISOString();

    try {
      await adminUpdatePricingRequest(request.id, payload);
    } catch {
      toast.error("Pricing request update failed");
      return;
    }

    await recordCommercialUpdate(`Pricing request moved to ${nextStatus}`, nextStatus === "approved" || nextStatus === "converted" ? "milestone" : "action");
    setPricingRequests(prev => prev.map(item => item.id === request.id ? { ...item, status: nextStatus, reviewed_at: payload.reviewed_at as string | null } : item));
    toast.success(`Request marked ${nextStatus}`);
    loadClientUpdates();
    onUpdate?.();
  };

  const applyPricingRequestToPackage = (request: PricingRequest) => {
    const inferredPackageName = request.package_name || (request.request_type === "custom" ? "Custom Plan" : "Package");
    setPackageName(inferredPackageName);
    setIsCustomPlan(request.request_type === "custom");
    setPlanConfig(prev => ({
      ...prev,
      monthly_fee: request.estimated_total,
    }));
    setPackageDetailsSummary([
      `Request type: ${request.request_type}`,
      `Status: ${request.status}`,
      `Estimated total: ${request.estimated_total} ${request.price_currency}`,
      request.selected_services.length > 0 ? `Services: ${request.selected_services.map(service => service.name).join(", ")}` : "",
      request.request_notes ? `Client notes: ${request.request_notes}` : "",
    ].filter(Boolean).join("\n"));
    toast.success("Pricing request loaded into package control");
  };

  const handleSaveNotes = async () => {
    try {
      await adminUpdateClient(client.id, { admin_notes: adminNotes });
    } catch {
      toast.error("Save failed");
      return;
    }
    toast.success("Notes saved!");
  };

  const handleSaveBrand = async () => {
    const payload = {
      logo_url: brandConfig.logo_url || null,
      theme_accent: brandConfig.primary_color,
      brand_colors: [brandConfig.primary_color, brandConfig.secondary_color],
    };
    try {
      await adminUpdateClient(client.id, payload);
    } catch {
      toast.error("Brand save failed");
      return;
    }
    toast.success("Brand settings saved!");
    onUpdate?.();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const ext = file.name.split(".").pop();
    const path = `${client.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("client-assets").upload(path, file);
    if (upErr) { toast.error("Upload failed"); setUploadingFile(false); return; }
    const { data: urlData } = supabase.storage.from("client-assets").getPublicUrl(path);
    await adminRecordAsset({
      client_id: client.id,
      file_name: file.name,
      storage_path: path,
      public_url: urlData.publicUrl,
      file_type: file.type,
      file_size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    });
    toast.success("File uploaded!");
    setUploadingFile(false);
    e.target.value = "";
  };

  const handleSendAdminMessage = async () => {
    if (!newAdminMessage.trim()) return;
    setSendingMessage(true);
    try {
      await adminSendMessage({
        client_id: client.id,
        sender: "admin",
        message: newAdminMessage.trim(),
        is_read: false,
      });
      setNewAdminMessage("");
      loadMessages();
    } catch {
      toast.error("Send failed");
    }
    setSendingMessage(false);
  };

  const displayName = profileData.company_name || profileData.username;
  const METRIC_KEYS: (keyof Pick<PlanConfig, "posts" | "reels" | "stories" | "designs">)[] = ["posts", "reels", "stories", "designs"];
  const usagePct = METRIC_KEYS.reduce((sum, key) => {
    const metric = planConfig[key];
    return sum + (metric.total > 0 ? metric.used / metric.total : 0);
  }, 0) / METRIC_KEYS.length;
  const latestUpdate = clientUpdates[0] || null;

  const tabs: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
    { id: "identity", label: "Identity", icon: <User className="w-3.5 h-3.5" /> },
    { id: "subscription", label: "Subscription", icon: <Package className="w-3.5 h-3.5" /> },
    { id: "assets", label: "Assets", icon: <Image className="w-3.5 h-3.5" /> },
    { id: "comms", label: "Notes & Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 shadow-2xl max-w-3xl w-full max-h-[91vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {/*  Header  */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-lg font-bold text-white shadow-sm">
              {displayName.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white font-bold text-lg leading-tight truncate">{displayName}</DialogTitle>
              <p className="text-indigo-200 text-xs mt-0.5">@{profileData.username}  {client.id.slice(0, 8)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase border flex-shrink-0 ${profileData.status === "active" ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30" :
              profileData.status === "pending" ? "bg-amber-400/20 text-amber-100 border-amber-300/30" :
                "bg-white/20 text-white/80 border-white/30"}`}>
              {profileData.status}
            </span>
          </div>
          {/* Tab bar */}
          <div className="flex gap-1 mt-4">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-indigo-200 hover:bg-white/10"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/*  Body  */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {/*  IDENTITY  */}
          {activeTab === "identity" && (
            <div className="p-5 space-y-5 fade-in">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company / Business Name">
                    <Input value={profileData.company_name} onChange={e => setProfileData(p => ({ ...p, company_name: e.target.value }))} placeholder="Acme Corp" />
                  </Field>
                  <Field label="Username">
                    <Input value={profileData.username} onChange={e => setProfileData(p => ({ ...p, username: e.target.value }))} placeholder="acmecorp" />
                  </Field>
                </div>
                <Field label="Account Status">
                  <Select value={profileData.status} onChange={e => setProfileData(p => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </Field>
                <button onClick={handleUpdateProfile} disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Security</h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Key className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Temporary Password</p>
                      <p className="text-xs text-slate-400 mt-0.5">Generate a one-time password for the client. It will be copied to your clipboard.</p>
                    </div>
                  </div>
                  <button onClick={handleResetPassword}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex-shrink-0 whitespace-nowrap">
                    <RefreshCw className="w-3.5 h-3.5" /> Generate & Copy
                  </button>
                </div>
                <div className="mt-3 p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600 leading-relaxed">Security Q&A: <span className="font-semibold">{client.security_question ? "Set" : "Not set"}</span>  Account created: {new Date(client.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
              </div>
            </div>
          )}

          {/*  SUBSCRIPTION  */}
          {activeTab === "subscription" && (
            <div className="p-5 space-y-5 fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Package", value: packageName || client.package_name || "—", sub: isCustomPlan ? "Custom control" : "Assigned package", tone: "bg-indigo-50 text-indigo-600" },
                  { label: "Monthly Fee", value: `${(planConfig.monthly_fee || 0).toLocaleString()}`, sub: planConfig.billing_cycle || "monthly", tone: "bg-emerald-50 text-emerald-600" },
                  { label: "Pricing History", value: String(pricingRequests.length), sub: `${pricingRequests.filter(request => request.status === "approved" || request.status === "converted").length} approved`, tone: "bg-cyan-50 text-cyan-600" },
                  { label: "Delivery", value: `${clientProgress}%`, sub: latestUpdate ? latestUpdate.title : "No recent update", tone: "bg-amber-50 text-amber-600" },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${card.tone}`}>{card.label}</div>
                    <p className="mt-3 text-lg font-bold text-slate-900 line-clamp-2">{card.value}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plan Type</h3>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => setIsCustomPlan(!isCustomPlan)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${isCustomPlan ? "bg-indigo-600" : "bg-slate-200"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isCustomPlan ? "left-6" : "left-1"}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Custom Plan</span>
                  </label>
                </div>
                {!isCustomPlan ? (
                  <div className="space-y-3">
                    <Field label="Package Name">
                      <Input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="Growth Retainer" />
                    </Field>
                    <Field label="Select Package">
                      <Select value={packageName} onChange={e => setPackageName(e.target.value)}>
                        <option value=""> Choose a package </option>
                        {packages.map(p => <option key={p.id} value={p.name}>{p.name} (${p.price}/mo)</option>)}
                      </Select>
                    </Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Custom Plan Label">
                      <Input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="Custom Plan" />
                    </Field>
                    <Field label="Monthly Fee ($)">
                      <Input type="number" value={planConfig.monthly_fee || 0} onChange={e => setPlanConfig(p => ({ ...p, monthly_fee: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Billing Cycle">
                      <Select value={planConfig.billing_cycle || "monthly"} onChange={e => setPlanConfig(p => ({ ...p, billing_cycle: e.target.value }))}>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </Select>
                    </Field>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <Field label="Client Status">
                    <Select value={clientStatus} onChange={e => setClientStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  </Field>
                  <Field label="Progress (%)">
                    <Input type="number" min={0} max={100} value={clientProgress} onChange={e => setClientProgress(Number(e.target.value))} />
                  </Field>
                </div>
                <Field label="Next Steps">
                  <textarea value={clientNextSteps} onChange={e => setClientNextSteps(e.target.value)} rows={3}
                    placeholder="Commercial or delivery next action"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                </Field>
                <Field label="Package Summary / Scope Notes">
                  <textarea value={packageDetailsSummary} onChange={e => setPackageDetailsSummary(e.target.value)} rows={5}
                    placeholder="Internal package summary, scoped deliverables, commercial notes"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                </Field>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Usage Metrics</h3>
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600">Overall Usage Health</span>
                    <span className={`text-xs font-bold ${usagePct >= 0.9 ? "text-rose-500" : usagePct >= 0.7 ? "text-amber-500" : "text-emerald-600"}`}>{Math.round(usagePct * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                    <div className={`h-full rounded-full ${usagePct >= 0.9 ? "bg-rose-400" : usagePct >= 0.7 ? "bg-amber-400" : "bg-gradient-to-r from-emerald-400 to-indigo-500"}`} style={{ width: `${Math.round(usagePct * 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {METRIC_KEYS.map(key => {
                    const metric = planConfig[key] as MetricItem;
                    const pct = metric.total > 0 ? Math.min(100, Math.round((metric.used / metric.total) * 100)) : 0;
                    return (
                      <div key={key} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-slate-600 capitalize">{key}</span>
                          <span className={`text-xs font-bold ${pct >= 90 ? "text-rose-500" : pct >= 70 ? "text-amber-500" : "text-indigo-500"}`}>{pct}%</span>
                        </div>
                        <ProgressBar used={metric.used} total={metric.total} />
                        <div className="flex gap-2 mt-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 mb-1 font-medium">Used</p>
                            <Input type="number" value={metric.used}
                              onChange={e => setPlanConfig(p => ({ ...p, [key]: { ...p[key], used: Number(e.target.value) } as MetricItem }))}
                              className="text-center !py-1.5 !text-xs" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 mb-1 font-medium">Total</p>
                            <Input type="number" value={metric.total}
                              onChange={e => setPlanConfig(p => ({ ...p, [key]: { ...p[key], total: Number(e.target.value) } as MetricItem }))}
                              className="text-center !py-1.5 !text-xs" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Offer</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Input value={activeOffer} onChange={e => setActiveOffer(e.target.value)} placeholder="e.g. 20% off next month" className="flex-1" />
                  <Input value={activeOfferLink} onChange={e => setActiveOfferLink(e.target.value)} placeholder="Offer link / checkout / proposal URL" />
                  <div className="flex justify-end">
                    <button onClick={handleSaveOffer}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex-shrink-0">
                      <Star className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pricing Requests Feed</h3>
                  <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide">{pricingRequests.length} requests</span>
                </div>
                {pricingRequests.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No pricing requests linked to this client yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pricingRequests.map(request => (
                      <div key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{request.package_name || `${request.selected_services.length} selected services`}</p>
                            <p className="text-xs text-slate-400 mt-1">{request.estimated_total.toLocaleString()} {request.price_currency} · {new Date(request.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${request.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : request.status === "reviewing" ? "bg-cyan-100 text-cyan-700 border-cyan-200" : request.status === "rejected" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{request.status}</span>
                        </div>
                        {request.selected_services.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {request.selected_services.slice(0, 6).map(service => (
                              <span key={`${request.id}-${service.id}`} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">{service.name}</span>
                            ))}
                          </div>
                        )}
                        {request.request_notes && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{request.request_notes}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => applyPricingRequestToPackage(request)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold transition-colors">
                            <TrendingUp className="w-3.5 h-3.5" /> Apply To Package Control
                          </button>
                          {request.status === "new" && (
                            <button onClick={() => updatePricingRequestStatus(request, "reviewing")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 text-[11px] font-bold transition-colors">
                              <RefreshCw className="w-3.5 h-3.5" /> Review
                            </button>
                          )}
                          {(request.status === "new" || request.status === "reviewing") && (
                            <button onClick={() => updatePricingRequestStatus(request, "approved")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[11px] font-bold transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {request.status !== "converted" && request.status !== "rejected" && (
                            <button onClick={() => updatePricingRequestStatus(request, "rejected")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-bold transition-colors">
                              <FileText className="w-3.5 h-3.5" /> Reject
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={handleResetCycle}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Cycle
                </button>
                <button onClick={handleSavePlan}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Save className="w-3.5 h-3.5" /> Save Plan
                </button>
              </div>
            </div>
          )}

          {/*  ASSETS  */}
          {activeTab === "assets" && (
            <div className="p-5 space-y-5 fade-in">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Brand Colors</h3>
                <div className="flex items-center gap-4">
                  {[
                    { label: "Primary", key: "primary_color" },
                    { label: "Secondary", key: "secondary_color" },
                  ].map(c => (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200 cursor-pointer overflow-hidden"
                          style={{ background: brandConfig[c.key as keyof typeof brandConfig] }}>
                          <input type="color" value={brandConfig[c.key as keyof typeof brandConfig]}
                            onChange={e => setBrandConfig(p => ({ ...p, [c.key]: e.target.value }))}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">{c.label}</p>
                        <p className="text-xs text-slate-400 font-mono">{brandConfig[c.key as keyof typeof brandConfig]}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveBrand}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Save className="w-3.5 h-3.5" /> Save Brand Settings
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Upload Asset</h3>
                <label className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${uploadingFile ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30"}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${uploadingFile ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                    {uploadingFile ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600">{uploadingFile ? "Uploading" : "Click to upload"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, SVG, PDF  max 10MB</p>
                  </div>
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" accept="image/*,.pdf,.svg" />
                </label>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  <span className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5 text-indigo-500" inline />App Studio Designs ({studioProjects.length})</span>
                </h3>
                {studioProjects.length === 0 ? (
                  <div className="py-10 text-center">
                    <Smartphone className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No saved designs for this client</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studioProjects.slice(0, 6).map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50/40 hover:border-indigo-100 transition-all">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm flex-shrink-0">
                          {p.service_type === "restaurant" ? "" : p.service_type === "cafe" ? "" : p.service_type === "salon" ? "" : ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{p.business_name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{p.service_type}  {p.selected_template}</p>
                        </div>
                        <a href={`/demo?name=${encodeURIComponent(p.business_name)}&service=${p.service_type}&theme=${p.selected_theme}&template=${p.selected_template}&dark=${p.is_dark_mode}`}
                          target="_blank" rel="noreferrer"
                          className="p-2 rounded-xl text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                    {studioProjects.length > 6 && (
                      <p className="text-xs text-indigo-400 text-center pt-1 font-medium flex items-center justify-center gap-1">
                        +{studioProjects.length - 6} more designs <ChevronRight className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/*  COMMS  */}
          {activeTab === "comms" && (
            <div className="p-5 space-y-4 fade-in">
              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Notes</h3>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={4}
                  placeholder="Internal notes, reminders, action items"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                <button onClick={handleSaveNotes}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Save className="w-3.5 h-3.5" /> Save Notes
                </button>
              </div>

              {/* Chat */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 360 }}>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700">Messages with {displayName.split(" ")[0]}</span>
                  <span className="ml-auto text-[10px] text-slate-400">{clientMessages.length} messages</span>
                </div>
                <div className="overflow-y-auto p-4 space-y-3" style={{ height: 260 }}>
                  {clientMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 pt-8">
                      <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-xs font-medium">No messages yet</p>
                    </div>
                  )}
                  {clientMessages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${m.sender === "admin"
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-200"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm"}`}>
                        {m.message || m.content}
                        <p className={`text-[10px] mt-1 ${m.sender === "admin" ? "text-indigo-200" : "text-slate-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>
                <div className="px-3 pb-3 flex gap-2">
                  <input value={newAdminMessage} onChange={e => setNewAdminMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && !sendingMessage && handleSendAdminMessage()}
                    placeholder={`Send a message to ${displayName.split(" ")[0]}`}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" />
                  <button onClick={handleSendAdminMessage} disabled={sendingMessage || !newAdminMessage.trim()}
                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40 flex items-center">
                    {sendingMessage ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <style>{`
        .fade-in { animation: fadeUp 0.2s ease-out; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Dialog>
  );
}
