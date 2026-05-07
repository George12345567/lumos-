import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Circle, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react';
import type { PortalMessage } from '@/services/clientPortalService';

interface Props {
  clientId: string;
  messages: PortalMessage[];
  onOptimisticAdd: (msg: PortalMessage) => void;
  onSendMessage: (message: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  accent: string;
  isArabic?: boolean;
  sending?: boolean;
}

function timeLabel(ts: string, isArabic?: boolean): string {
  try {
    return new Date(ts).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function dateLabel(ts: string, isArabic?: boolean): string {
  try {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return isArabic ? 'اليوم' : 'Today';
    if (d.toDateString() === yesterday.toDateString()) return isArabic ? 'أمس' : 'Yesterday';
    return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function shouldShowDate(messages: PortalMessage[], index: number, isArabic?: boolean): string | null {
  if (index === 0) return dateLabel(messages[0].created_at, isArabic);
  const prevDate = new Date(messages[index - 1].created_at).toDateString();
  const currDate = new Date(messages[index].created_at).toDateString();
  if (prevDate !== currDate) return dateLabel(messages[index].created_at, isArabic);
  return null;
}

export function MessagesSection({ clientId, messages, onOptimisticAdd, onSendMessage, onRefresh, accent, isArabic, sending: externalSending }: Props) {
  const [text, setText] = useState('');
  const [sendingLocal, setSendingLocal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<PortalMessage[]>(messages);
  const endRef = useRef<HTMLDivElement>(null);
  const isSending = externalSending ?? sendingLocal;

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [localMessages.length]);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || isSending) return;
    setSendingLocal(true);
    setSendError(null);
    setText('');

    const tempId = `temp-${Date.now()}`;
    const clientMsg: PortalMessage = {
      id: tempId,
      client_id: clientId,
      message: value,
      sender: 'client',
      created_at: new Date().toISOString(),
    };
    onOptimisticAdd(clientMsg);
    setLocalMessages((prev) => [...prev, clientMsg]);

    const success = await onSendMessage(value);
    if (!success) {
      setSendError(isArabic ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setText(value);
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
    setSendingLocal(false);
  }, [text, isSending, clientId, onOptimisticAdd, onSendMessage, isArabic]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="relative">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: accent }}
          >
            L
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            {isArabic ? 'فريق لوموس' : 'Lumos Team'}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
          title={isArabic ? 'تحديث المحادثة' : 'Refresh chat'}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {sendError && (
        <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{sendError}</span>
          <button type="button" onClick={() => setSendError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">
            {isArabic ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      <div
        className="flex min-h-[360px] max-h-[55vh] flex-col gap-1 overflow-y-auto bg-slate-50/70 px-3 py-3"
        style={{
          backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(0,0,0,0.015) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      >
        {localMessages.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center text-slate-400">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">{isArabic ? 'لا توجد رسائل بعد. قل مرحبًا!' : 'No messages yet. Say hello!'}</p>
          </div>
        ) : (
          localMessages.map((m, i) => {
            const isClient = m.sender === 'client';
            const dateSep = shouldShowDate(localMessages, i, isArabic);
            const isLastInGroup = i === localMessages.length - 1 || localMessages[i + 1].sender !== m.sender;

            return (
              <div key={m.id}>
                {dateSep && (
                  <div className="flex items-center justify-center py-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium text-slate-500 shadow-sm border border-slate-100">
                      {dateSep}
                    </span>
                  </div>
                )}
                <div className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        isClient
                          ? 'text-white'
                          : 'bg-white text-slate-800 border border-slate-100'
                      }`}
                      style={isClient ? { backgroundColor: accent } : undefined}
                    >
                      <p className="whitespace-pre-line break-words leading-relaxed">{m.message}</p>
                      <div className={`mt-1 flex items-center gap-1 ${isClient ? 'justify-end' : 'justify-start'}`}>
                        <span
                          className={`text-[10px] ${
                            isClient ? 'text-white/60' : 'text-slate-400'
                          }`}
                        >
                          {timeLabel(m.created_at, isArabic)}
                        </span>
                        {isClient && isLastInGroup && (
                          <CheckCheck className="h-3 w-3 text-white/70" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4">
        <form onSubmit={submit} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSendError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={isArabic ? 'اكتب رسالة…' : 'Type a message…'}
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            <Send className={`h-4 w-4 ${isArabic ? 'rotate-180' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
}