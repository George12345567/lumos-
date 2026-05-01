const fs = require('fs');
let c = fs.readFileSync('D:/my web lumos/LAST LUMOS PROCECC/src/components/pricing/PricingModal.orig.tsx', 'utf8');
const oldlen = c.length;

// Remove imports
c = c.replace("import { supabase } from '@/lib/supabaseClient';\n", '');
c = c.replace("import { submitContactForm } from '@/services/submissionService';\n", '');
c = c.replace("import { submitPricingRequest } from '@/services/pricingRequestService';\n", '');
c = c.replace("import type { PricingRequest } from '@/types/dashboard';\n", '');
c = c.replace("import { useAuth } from '@/context/AuthContext';\n", '');

// Remove state
c = c.replace('  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);\n', '');
c = c.replace('  const [latestClientRequest, setLatestClientRequest] = useState<PricingRequest | null>(null);\n', '');
c = c.replace('  const [latestRequestLoading, setLatestRequestLoading] = useState(false);\n', '');

// Remove isKnownClient
c = c.replace('  const isKnownClient = isAuthenticated && !isAdmin && !!client?.id;\n', '');
c = c.replace('  const isEditing = !!editingRequestId;\n', '  const isEditing = false;\n');
c = c.replace("const accountDisplayName = client?.company_name || client?.display_name || client?.username || (isAr ? 'عميل مسجل' : 'Logged- in client');\n", "const accountDisplayName = isAr ? 'عميل' : 'Guest';\n");
c = c.replace('  const activeRequestContext = initialRequest || latestClientRequest;\n', '  const activeRequestContext = null;\n');

// Remove setLanguage side effect
c = c.replace('  useEffect(() => {\n    setLanguage(lang);\n  }, [lang, setLanguage]);\n', '');

// Remove initialRequest from props
c = c.replace('  initialRequest?: PricingRequest | null;\n', '');
c = c.replace('{ open, onOpenChange, initialRequest = null }', '{ open, onOpenChange }');

// Remove useAuth client destructure
c = c.replace('const { client, isAuthenticated, isAdmin } = useAuth();\n', 'const { } = useAuth();\n');

// Remove setLanguage from useLanguage
c = c.replace('const { language, setLanguage, isArabic: globalArabic } = useLanguage();', 'const { language, isArabic: globalArabic } = useLanguage();');

// Remove hydrateRequest
const h1 = '  const hydrateRequest = useCallback((request: PricingRequest) => {';
c = c.replace(RegExp(h1 + '[\\s\\S]*?\\n  \\}, \\[\\]\\);'), '');

// Remove loadLatestClientRequest useEffect  
const h2 = "  useEffect(() => {\n    if (!open || !isKnownClient || !client?.id) {\n      setLatestClientRequest(null);\n      return;\n    }\n\n    let cancelled = false;\n\n    const loadLatestClientRequest = async () => {";
c = c.replace(RegExp(h2 + '[\\s\\S]*?\\[client\\?\\.id, isKnownClient, open\\]\\);'), '');

// Simplify reset on open
c = c.replace('  useEffect(() => {\n    if (open) {\n      if (initialRequest) {\n        hydrateRequest(initialRequest);\n      } else {\n        setEditingRequestId(null);\n        setStep', '  useEffect(() => {\n    if (open) {\n        setStep');
c = c.replace(/\[hydrateRequest, initialRequest, open\]\);/, '[open]);');

// Simplify stepsList
c = c.replace("{ key: 'details', en: isKnownClient ? 'Notes' : 'Contact', ar: isKnownClient ? 'ملاحظات' : 'بياناتك' },", "{ key: 'details', en: 'Contact', ar: 'بياناتك' },");
c = c.replace('], [isKnownClient]);', ']);');

// Simplify canProceed
c = c.replace('? (isKnownClient ? true : !!(contact.name.trim() && isValidPhoneNumber(contact.phone) && isEmailValid))', '?(!!(contact.name.trim() && isValidPhoneNumber(contact.phone) && isEmailValid))');

// Simplify dashboard status section
c = c.replace("{isKnownClient && activeRequestContext && requestStatusMeta && (\n                <div", "{/* dashboard status removed */\n                <div");
c = c.replace(/\{!initialRequest && latestClientRequest && latestClientRequest\.status !== 'converted' && !isEditing && \(\n                      <div className="mt-4 flex flex- wrap items-center gap-2">[\s\S]*?<p className="mt-4 text- xs text-slate-400">.*?<\/p>\n                    \)\n                  \)\n                \)\n\n                \{mode && totals\. count > 0/, '{/* latest request buttons removed */}\n\n              {mode && totals.count > 0');

// Simplify handleSend
c = c.replace("  /* ── Send: Supabase + WhatsApp ── */\n  const handleSend = useCallback(async () => {\n    setSending(true);\n    const msg = buildMessage();\n\n    if (isKnownClient && client?.id) {\n      const result = await submitPricingRequest({\n        requestId: editingRequestId,\n        clientId: client.id,", "  /* ── Send: WhatsApp Only ── */\n  const handleSend = useCallback(async () => {\n    setSending(true);\n    const msg = buildMessage();\n\n    if (typeof window.dataLayer !== 'undefined') {\n      window.dataLayer.push({ event: 'pricing_submit', pricing_total: totals.total, pricing_mode: mode });\n    }\n\n    window.open(`https://wa.me/20127766616?text=${encodeURIComponent(msg)}`, '_blank');\n    toast.success(isAr ? 'تم فتح واتساب — أرسلنا طلبك مباشرة!' : 'WhatsApp opened — request sent directly!');\n    setSending(false);\n  }, [buildMessage, isAr, mode, totals]);\n\n/* REMOVE_FROM_HERE */\n\n    const _stub = editingRequestId;\n    const _stub2 = client?.id;\n    const _stub3 = submitPricingRequest({\n        requestId: editingRequestId,\n        clientId: client.id,");

// Simplify submit button class
c = c.replace("isKnownClient ? 'bg- gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_20px_ rgba(16,185,129,0.25)] hover: from-emerald-700 hover: to-teal-700' : 'bg-[#25D366] shadow-[0_4px_20px_ rgba(37,211,102,0.35)] hover: bg-[#20b558] hover: shadow-[0_6px_24px_ rgba(37,211,102,0.45)]'", "'bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.35)] hover: bg-[#20b558]'");

// Simplify submit button icon/text
c = c.replace("{isKnownClient ? <Check className=\"w-3.5 h-3.5\" /> : <MessageSquare className=\"w-3.5 h-3.5\" />}", "<MessageSquare className=\"w-3.5 h-3.5\" />}");
c = c.replace("{isKnownClient ? (isEditing ? (isAr ? 'تحديث الطلب' : 'Update Request') : (isAr ? 'إرسال للمراجعة' : 'Send For Review')) : (isAr ? 'تأكيد عبر واتساب' : 'Send via WhatsApp')}", "(isAr ? 'تأكيد عبر واتساب' : 'Send via WhatsApp')");

// Simplify step 3 header
c = c.replace("{isKnownClient ? (isAr ? 'الحساب والملاحظات' : 'Account & Notes') : (isAr ? 'بياناتك' : 'Your Details')}", "(isAr ? 'بياناتك' : 'Your Details')");

// Simplify step 3 description
c = c.replace("{isKnownClient\n                            ? (isAr ? 'سنستخدم بيانات حسابك الحالية، ويمكنك إضافة ملاحظات فقط.' : 'We will use your account data automatically. Add notes only if needed.')\n                            : (isAr ? 'نحتاج لبياناتك لنبدأ العمل على مشروعك' : 'Share your details so we can get started.')}", "(isAr ? 'نحتاج لبياناتك لنبدأ العمل على مشروعك' : 'Share your details so we can get started.')");

// Simplify review step contact
c = c.replace("{false} ? (isAr ? '��لحساب' : 'Account') : (isAr ? 'بيانات التواصل' : 'Contact')}", "(isAr ? 'بيانات التواصل' : 'Contact')}");
c = c.replace('{false} ? accountDisplayName : contact.name}', 'contact.name}');
c = c.replace("{false} ? (isAr ? 'سيُربط الطلب ببروفايل العميل مباشرة' : 'This request will sync directly to the client profile') : contact.phone}", 'contact.phone}');
c = c.replace("{false} ? (isAr ? 'تظهر داخل حسابك بعد الإرسال' : 'Visible in your account after submit') : (isAr ? 'خلال 24 ساعة' : 'Within 24 Hours')}", "(isAr ? 'خلال 24 ساعة' : 'Within 24 Hours')}");
c = c.replace("{false} ? (isEditing ? (isAr ? 'سيتم تحديث الطلب الحالي في حسابك ولوحة الأدمن للمتابعة' : 'Your existing request will be updated in your client profile and admin dashboard') : (isAr ? 'يتم حفظ الطلب في حسابك ولوحة الأدمن للمتابعة' : 'Saved to your client profile and admin dashboard for follow-up')) : (isAr ? 'يتم الإرسال عبر واتساب مع نسخة في لوحة التحكم' : 'Sent via WhatsApp + saved to dashboard')}", "(isAr ? 'يتم الإرسال عبر واتساب مباشرة — سيتواصل معك فريقنا!' : 'Sent directly via WhatsApp — our team will reach out to you!')");

// Simplify requestStatusMeta
c = c.replace(/const requestStatusMeta = useMemo\(\(\) => \{\n    if \(!activeRequestContext\) return null;\n\n    switch \(activeRequestContext\.status\) \{[\s\S]*?\n  \}, \[activeRequestContext, isAr\]\);\n\n  const requestFlowSteps = useMemo\(\(\) => \{\n    if \(!activeRequestContext\) return \[\];[\s\S]*?\n  \}, \[activeRequestContext, isAr\]\);/, "const requestStatusMeta = useMemo(() => null, []);\n  const requestFlowSteps = useMemo(() => [], []);");

// Simplify useMemo deps
c = c.replace('], [step, mode, selectedPkg, selectedServices, contact, scrollTop, isKnownClient, isAr]);', '], [step, mode, selectedPkg, selectedServices, contact, scrollTop, isAr]);');

// Remove old handleSend remaining code
c = c.replace(/\n    const _stub = editingRequestId;\n    const _stub2 = client\?\.id;\n    const _stub3 = submitPricingRequest\(\{[\s\S]*?mode, onOpenChange, selectedPackageName, selectedPkg, totals\]\);/, '');

// Replace emerald gradient with WhatsApp green in remaining buttons
c = c.replace(/bg- gradient-to-r from-emerald-600 to-teal-600/g, 'bg-[#25D366]');
c = c.replace(/hover: from-emerald-700 hover: to-teal-700/g, 'hover: bg-[#20b558]');
c = c.replace(/shadow-\[0_4px_20px_ rgba\(16,185,129,0\.25\)\]/g, 'shadow-[0_4px_20px_rgba(37,211,102,0.35)]');

// Update comment
c = c.replace('4-step wizard · Auto geo-detection · WhatsApp + Dashboard', '4-step wizard · Auto geo-detection · WhatsApp Only');

// Remove REMOVE_FROM_HERE marker
c = c.replace('\n/* REMOVE_FROM_HERE */\n', '');

// Remove extra blank lines from removed code
c = c.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync('D:/my web lumos/LAST LUMOS PROCECC/src/components/pricing/PricingModal.cleaned.tsx', c);
console.log('Old:', oldlen, 'New:', c.length);