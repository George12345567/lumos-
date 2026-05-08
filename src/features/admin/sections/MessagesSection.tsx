import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { useClient, useSessionEmail } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Client, PricingRequest } from '@/types/dashboard';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { useAdminPermission } from '../hooks/useAdminPermission';
import { useClientConversations, type AdminClientMessage } from '../data/useClientConversations';
import { useClientFiles } from '../data/useClientFiles';

interface MessagesSectionProps {
  clients: Client[];
  pricingRequests: PricingRequest[];
  selectedClientId?: string | null;
  onSelectClient?: (id: string | null) => void;
  onOpenClient?: (id: string) => void;
}

export function MessagesSection({
  clients,
  pricingRequests,
  selectedClientId,
  onSelectClient,
  onOpenClient,
}: MessagesSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const conv = useClientConversations();
  const files = useClientFiles();
  const canSend = useAdminPermission('messages', 'create');
  const canUpload = useAdminPermission('files', 'upload' as 'create');
  const canDelete = useAdminPermission('messages', 'delete');
  const adminProfile = useClient();
  const adminEmail = useSessionEmail();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAdminUserId(data.session?.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  const adminSender = useMemo(
    () => ({
      id: adminUserId,
      name: adminProfile?.username || (adminEmail ? adminEmail.split('@')[0] : null) || 'Lumos team',
    }),
    [adminUserId, adminProfile?.username, adminEmail],
  );

  const [search, setSearch] = useState('');
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const activeId = selectedClientId ?? internalSelected;

  const setActive = useCallback(
    (id: string | null) => {
      if (onSelectClient) onSelectClient(id);
      else setInternalSelected(id);
    },
    [onSelectClient],
  );

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conv.conversations.filter((c) => {
      if (!term) return true;
      const client = clientById.get(c.client_id);
      const haystack = [
        client?.company_name, client?.username, client?.email, client?.phone, c.last_message?.message,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [conv.conversations, search, clientById]);

  const activeMessages = useMemo(
    () => conv.messages.filter((m) => m.client_id === activeId),
    [conv.messages, activeId],
  );

  const activeClient = activeId ? clientById.get(activeId) || null : null;
  const activeRequests = useMemo(
    () => (activeId ? pricingRequests.filter((r) => r.client_id === activeId) : []),
    [pricingRequests, activeId],
  );

  // Auto-mark client messages read when this thread is opened.
  // IMPORTANT: depend only on the memoized callback identity — depending on
  // the entire `conv` object would re-run on every parent render and spam
  // the database with mark-read updates.
  const markClientRead = conv.markClientRead;
  useEffect(() => {
    if (activeId) {
      void markClientRead(activeId);
    }
  }, [activeId, markClientRead]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الرسائل', 'Messages')}
        subtitle={t(
          'محادثات حية مع العملاء. تظهر الرسائل الجديدة في الوقت الفعلي.',
          'Live conversations with clients. New messages appear in realtime.',
        )}
        actions={
          <SoftButton variant="outline" size="md" onClick={() => void conv.refresh()}>
            <RefreshCw className="w-4 h-4" />
            {t('تحديث', 'Refresh')}
          </SoftButton>
        }
      />

      {conv.loading && conv.messages.length === 0 ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
          {/* Conversation list */}
          <SoftCard className="lg:col-span-3 p-3 flex flex-col">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('بحث…', 'Search…')}
                className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
              {filteredConversations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {t('لا توجد محادثات بعد.', 'No conversations yet.')}
                </p>
              ) : (
                filteredConversations.map((c) => {
                  const client = clientById.get(c.client_id);
                  const initial = (client?.company_name || client?.username || '?').slice(0, 1).toUpperCase();
                  const active = c.client_id === activeId;
                  return (
                    <button
                      key={c.client_id}
                      type="button"
                      onClick={() => setActive(c.client_id)}
                      className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-3 ${
                        active ? 'bg-emerald-50 ring-1 ring-emerald-100' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-2xl text-white font-bold text-sm flex items-center justify-center shrink-0 ${
                        client?.avatar_url ? '' : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                      }`}>
                        {client?.avatar_url ? (
                          <img src={client.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="" />
                        ) : initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {client?.company_name || client?.username || c.client_id.slice(0, 8)}
                          </p>
                          {c.unread_count > 0 ? (
                            <span className="text-[9px] px-1.5 h-4 inline-flex items-center rounded-full bg-emerald-500 text-white font-bold">
                              {c.unread_count}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.last_message?.sender === 'client' ? '' : '✓ '}
                          {c.last_message?.message || ''}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </SoftCard>

          {/* Thread */}
          <SoftCard className="lg:col-span-6 p-0 flex flex-col overflow-hidden">
            {activeId && activeClient ? (
              <ChatThread
                clientId={activeId}
                client={activeClient}
                messages={activeMessages}
                onSend={async (msg, attachment) => {
                  if (!canSend) {
                    toast.error(t('ليس لديك صلاحية إرسال.', "You can't send."));
                    return false;
                  }
                  return conv.send(activeId, msg, { attachment, sender: adminSender });
                }}
                onUpload={canUpload
                  ? async (file) => files.upload({ clientId: activeId, file, category: 'messages' })
                  : null}
                onDelete={canDelete ? conv.remove : null}
                isAr={isAr}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-10">
                <EmptyState
                  icon={MessageSquare}
                  title={t('اختر محادثة', 'Pick a conversation')}
                  description={t(
                    'حدّد عميلاً من القائمة لرؤية المحادثة.',
                    'Select a client from the list to see the conversation.',
                  )}
                />
              </div>
            )}
          </SoftCard>

          {/* Context panel */}
          <SoftCard className="lg:col-span-3 p-5 space-y-4">
            {!activeClient ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {t('اختر محادثة لعرض تفاصيل العميل.', 'Select a conversation to see client context.')}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold flex items-center justify-center">
                    {activeClient.avatar_url ? (
                      <img src={activeClient.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="" />
                    ) : (activeClient.company_name || activeClient.username || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{activeClient.company_name || activeClient.username}</p>
                    <p className="text-[11px] text-slate-500 truncate">{activeClient.email}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {activeClient.phone ? (
                    <p className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3 h-3" /> {activeClient.phone}
                    </p>
                  ) : null}
                  {activeClient.industry ? (
                    <p className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3 h-3" /> {activeClient.industry}
                    </p>
                  ) : null}
                  {activeClient.package_name ? (
                    <SoftBadge tone="emerald">{activeClient.package_name}</SoftBadge>
                  ) : null}
                </div>

                {activeRequests.length > 0 ? (
                  <div className="pt-3 border-t border-emerald-900/5">
                    <p className="text-[11px] font-bold uppercase text-emerald-700 mb-1.5">
                      {t('طلبات مرتبطة', 'Related requests')}
                    </p>
                    <ul className="space-y-1.5">
                      {activeRequests.slice(0, 4).map((r) => (
                        <li key={r.id} className="text-xs">
                          <span className="font-mono font-bold text-emerald-700">{r.invoice_number || r.id.slice(0, 8)}</span>
                          <span className="text-slate-500"> · {r.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="pt-3 border-t border-emerald-900/5 flex flex-wrap gap-2">
                  {activeClient.phone ? (
                    <a
                      href={`https://wa.me/${activeClient.phone.replace(/[^\d+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-[11px] font-semibold"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  ) : null}
                  {activeClient.email ? (
                    <a
                      href={`mailto:${activeClient.email}`}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-[11px] font-semibold"
                    >
                      <Mail className="w-3 h-3" /> {t('بريد', 'Email')}
                    </a>
                  ) : null}
                  {onOpenClient ? (
                    <button
                      type="button"
                      onClick={() => onOpenClient(activeClient.id)}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 text-[11px] font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> {t('فتح العميل', 'Open client')}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </SoftCard>
        </div>
      )}
    </div>
  );
}

function ChatThread({
  clientId, client, messages, onSend, onUpload, onDelete, isAr,
}: {
  clientId: string;
  client: Client;
  messages: AdminClientMessage[];
  onSend: (msg: string, attachment?: { url: string; name: string; type?: string }) => Promise<boolean>;
  onUpload: ((file: File) => Promise<{ success: boolean; signedUrl?: string }>) | null;
  onDelete: ((id: string) => Promise<void>) | null;
  isAr: boolean;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSending(true);
    const ok = await onSend(trimmed);
    if (ok) setInput('');
    setSending(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setSending(true);
    const r = await onUpload(file);
    if (r.success && r.signedUrl) {
      await onSend(`📎 ${file.name}`, { url: r.signedUrl, name: file.name, type: file.type });
    }
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <header className="px-5 py-4 border-b border-emerald-900/5 dark:border-white/5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm flex items-center justify-center">
          {client.avatar_url ? (
            <img src={client.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="" />
          ) : (client.company_name || client.username || '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{client.company_name || client.username || clientId.slice(0, 8)}</p>
          <p className="text-[11px] text-slate-500 truncate">{client.email}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">
            {t('لا توجد رسائل بعد. أرسل أول رسالة لبدء المحادثة.', 'No messages yet. Send the first one to start the conversation.')}
          </p>
        ) : (
          messages.map((m) => {
            const fromTeam = m.sender === 'team' || m.sender === 'admin';
            const senderLabel = m.sender_name || (fromTeam ? t('فريق Lumos', 'Lumos team') : t('العميل', 'Client'));
            return (
              <div key={m.id} className={`flex ${fromTeam ? 'justify-end' : 'justify-start'}`}>
                <div className={`group max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  fromTeam ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100'
                }`}>
                  <p className={`text-[10px] uppercase tracking-wide font-semibold mb-1 ${fromTeam ? 'text-white/60' : 'text-emerald-700/70'}`}>
                    {senderLabel}
                  </p>
                  {m.attachment_url ? (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 underline decoration-dotted"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {m.attachment_name || 'attachment'}
                    </a>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  )}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className={`text-[10px] ${fromTeam ? 'text-white/50' : 'text-emerald-700/70'}`}>
                      {new Date(m.created_at).toLocaleTimeString(isAr ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('حذف هذه الرسالة؟', 'Delete this message?'))) void onDelete(m.id);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition ${fromTeam ? 'text-white/60 hover:text-white' : 'text-emerald-700/60 hover:text-emerald-900'}`}
                        title={t('حذف', 'Delete')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="px-5 py-3 border-t border-emerald-900/5 dark:border-white/5">
        <div className="flex items-end gap-2">
          {onUpload ? (
            <>
              <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center"
                title={t('إرفاق ملف', 'Attach file')}
              >
                <Paperclip className="w-4 h-4 text-slate-600" />
              </button>
            </>
          ) : null}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder={t('اكتب رسالة…', 'Type a message…')}
            className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
}

void User;
