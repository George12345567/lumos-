import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { sendClientPortalMessage } from '@/services/clientPortalService';
import { Card } from '../components/Card';
import type { PortalMessage } from '../hooks/usePortalData';

interface Props {
  clientId: string;
  messages: PortalMessage[];
  onOptimisticAdd: (msg: PortalMessage) => void;
  accent: string;
}

function timeLabel(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessagesSection({ clientId, messages, onOptimisticAdd, accent }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    const tempId = `temp-${Date.now()}`;
    onOptimisticAdd({
      id: tempId,
      client_id: clientId,
      message: value,
      sender: 'client',
      created_at: new Date().toISOString(),
    });
    try {
      await sendClientPortalMessage(clientId, value);
    } catch {
      toast.error('Could not send your message.');
      setText(value);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card icon={MessageCircle} title="Messages" description="Direct line to your team.">
      <div
        className="flex max-h-[60vh] min-h-[280px] flex-col gap-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="m-auto text-center text-sm text-slate-400">
            <MessageCircle className="mx-auto mb-2 h-6 w-6" />
            No messages yet. Say hello to start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const isClient = m.sender === 'client';
            return (
              <div key={m.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    isClient ? 'text-white' : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                  style={isClient ? { backgroundColor: accent } : undefined}
                >
                  <p className="whitespace-pre-line break-words">{m.message}</p>
                  <p className={`mt-1 text-[10px] ${isClient ? 'text-white/70' : 'text-slate-400'}`}>{timeLabel(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit(e as unknown as React.FormEvent);
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder="Type a message…"
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending' : 'Send'}
        </button>
      </form>
    </Card>
  );
}
