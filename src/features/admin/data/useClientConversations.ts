import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface AdminClientMessage {
  id: string;
  client_id: string;
  message: string;
  sender: 'client' | 'team' | 'admin' | string;
  sender_id?: string | null;
  sender_name?: string | null;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  created_at: string;
}

export interface AdminConversationSummary {
  client_id: string;
  last_message: AdminClientMessage | null;
  unread_count: number;
  total: number;
}

interface UseClientConversationsResult {
  messages: AdminClientMessage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  send: (
    clientId: string,
    message: string,
    options?: {
      attachment?: { url: string; name: string; type?: string };
      sender?: { id?: string | null; name?: string | null };
    },
  ) => Promise<boolean>;
  markRead: (id: string) => Promise<void>;
  markClientRead: (clientId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Subscribe to one client's INSERT events for realtime updates. */
  subscribeToClient: (clientId: string, onInsert: (msg: AdminClientMessage) => void) => () => void;
  conversations: AdminConversationSummary[];
}

/**
 * Loads every client_messages row visible to the admin (RLS handles scoping).
 * Realtime is enabled if the migration `20260507140100_client_messages_rls.sql`
 * added the table to `supabase_realtime`. If Realtime is disabled at the
 * project level, the UI falls back to the manual refresh button.
 */
export function useClientConversations(): UseClientConversationsResult {
  const [messages, setMessages] = useState<AdminClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const failedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('client_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(2000);
      if (queryError) throw queryError;
      setMessages((data as AdminClientMessage[]) || []);
      failedRef.current = false;
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Failed to load messages';
      console.error('useClientConversations refresh failed:', m);
      setMessages([]);
      setError(m);
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Global realtime: keep the messages list fresh when any row changes.
    const ch = supabase
      .channel('admin-client-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages' }, (payload) => {
        const next = payload.new as AdminClientMessage;
        setMessages((prev) => (prev.find((m) => m.id === next.id) ? prev : [...prev, next]));
        if (next.sender === 'client') {
          toast.info('New client message');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'client_messages' }, (payload) => {
        const next = payload.new as AdminClientMessage;
        setMessages((prev) => prev.map((m) => (m.id === next.id ? { ...m, ...next } : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'client_messages' }, (payload) => {
        const old = payload.old as AdminClientMessage;
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();

    channelRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [refresh]);

  const send = useCallback(
    async (
      clientId: string,
      message: string,
      options?: {
        attachment?: { url: string; name: string; type?: string };
        sender?: { id?: string | null; name?: string | null };
      },
    ) => {
      try {
        const payload: Partial<AdminClientMessage> = {
          client_id: clientId,
          message,
          sender: 'team',
          is_read: false,
          sender_id: options?.sender?.id ?? null,
          sender_name: options?.sender?.name ?? null,
        };
        if (options?.attachment) {
          payload.attachment_url = options.attachment.url;
          payload.attachment_name = options.attachment.name;
          payload.attachment_type = options.attachment.type;
        }
        const { error } = await supabase.from('client_messages').insert([payload]);
        if (error) throw error;
        return true;
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Failed to send';
        toast.error(m);
        return false;
      }
    },
    [],
  );

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('client_messages')
      .update({ is_read: true })
      .eq('id', id);
    if (error) console.error('markRead failed:', error);
  }, []);

  const markClientRead = useCallback(async (clientId: string) => {
    // Don't try to mark-read while the data layer is in a failed state —
    // a 400 here was contributing to the request spam.
    if (failedRef.current) return;
    const { error: updateError } = await supabase
      .from('client_messages')
      .update({ is_read: true })
      .eq('client_id', clientId)
      .eq('sender', 'client')
      .eq('is_read', false);
    if (updateError) {
      console.error('markClientRead failed:', updateError.message || updateError);
      // After one failure, suppress further calls until a successful refresh.
      failedRef.current = true;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('client_messages').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const subscribeToClient = useCallback(
    (clientId: string, onInsert: (msg: AdminClientMessage) => void) => {
      const channel = supabase
        .channel(`admin-thread-${clientId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'client_messages', filter: `client_id=eq.${clientId}` },
          (payload) => onInsert(payload.new as AdminClientMessage),
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    },
    [],
  );

  const conversations = useMemo<AdminConversationSummary[]>(() => {
    const map = new Map<string, AdminConversationSummary>();
    for (const m of messages) {
      const cur = map.get(m.client_id) ?? { client_id: m.client_id, last_message: null, unread_count: 0, total: 0 };
      cur.total += 1;
      if (m.sender === 'client' && !m.is_read) cur.unread_count += 1;
      if (!cur.last_message || new Date(m.created_at) > new Date(cur.last_message.created_at)) {
        cur.last_message = m;
      }
      map.set(m.client_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ad = a.last_message?.created_at || '';
      const bd = b.last_message?.created_at || '';
      return bd.localeCompare(ad);
    });
  }, [messages]);

  return { messages, loading, error, refresh, send, markRead, markClientRead, remove, subscribeToClient, conversations };
}
