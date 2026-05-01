/**
 * AddClientModal.tsx  – Quick modal to create a new client account
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  User, Building2, Package, KeyRound, RefreshCw,
  Plus, Copy, CheckCircle, Eye, EyeOff,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { adminText } from "@/data/adminI18n";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (data: {
    username: string;
    email: string;
    company_name?: string;
    status: string;
    package_name?: string;
    password: string;
  }) => Promise<void>;
}

const INPUT_CLS =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all disabled:opacity-50";

const SELECT_CLS =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all";

const LABEL_CLS = "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5";

const genPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function AddClientModal({ open, onOpenChange, onAdd }: Props) {
  const { isArabic } = useLanguage();
  const tx = (key: Parameters<typeof adminText>[0]) => adminText(key, isArabic);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    company_name: "",
    status: "active",
    package_name: "",
    password: genPassword(),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const regenerate = () => {
    const p = genPassword();
    setForm(prev => ({ ...prev, password: p }));
    setCopied(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(form.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(tx("passwordCopied"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) { toast.error(tx("usernameRequired")); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (!form.password.trim()) { toast.error(tx("passwordRequired")); return; }
    setSaving(true);
    try {
      await onAdd({
        username: form.username.trim(),
        email: form.email.trim(),
        company_name: form.company_name.trim() || undefined,
        status: form.status,
        package_name: form.package_name.trim() || undefined,
        password: form.password,
      });
      setForm({ username: "", email: "", company_name: "", status: "active", package_name: "", password: genPassword() });
      onOpenChange(false);
    } catch {
      // errors handled in hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 shadow-2xl max-w-lg w-full rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-bold text-lg leading-tight">{tx("addNewClient")}</DialogTitle>
              <p className="text-indigo-200 text-xs mt-0.5">{tx("createNewClientAccount")}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Username + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>
                <User className="inline w-3 h-3 mr-1" /> {tx("username")} *
              </label>
              <input
                value={form.username}
                onChange={set("username")}
                placeholder="e.g. acmecorp"
                className={INPUT_CLS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                <Building2 className="inline w-3 h-3 mr-1" /> {tx("companyName")}
              </label>
              <input
                value={form.company_name}
                onChange={set("company_name")}
                placeholder="Acme Corp"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={LABEL_CLS}>Email *</label>
            <input
              value={form.email}
              onChange={set("email")}
              placeholder="name@domain.com"
              className={INPUT_CLS}
              required
              type="email"
            />
          </div>

          {/* Status + Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>{tx("status")}</label>
              <select value={form.status} onChange={set("status")} className={SELECT_CLS}>
                <option value="active">{tx("active")}</option>
                <option value="pending">{tx("pending")}</option>
                <option value="suspended">{tx("suspended")}</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>
                <Package className="inline w-3 h-3 mr-1" /> {tx("packageOptional")}
              </label>
              <input
                value={form.package_name}
                onChange={set("package_name")}
                placeholder="e.g. Starter Plan"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={LABEL_CLS}>
              <KeyRound className="inline w-3 h-3 mr-1" /> {tx("password")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  className={INPUT_CLS + " pr-10"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={regenerate}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all"
                title="Regenerate password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={copy}
                className={`px-3 py-2.5 rounded-xl border transition-all ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600"}`}
                title="Copy password"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{tx("shareTempPassword")}</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              {tx("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {saving ? tx("creating") : tx("createClient")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
