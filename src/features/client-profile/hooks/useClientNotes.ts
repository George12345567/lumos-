import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchClientNotes,
  markClientNoteRead,
  type ClientNote,
} from '@/services/clientNotesService';

export function useClientNotes(clientId: string | undefined) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchClientNotes(clientId);
      setNotes(next);
      failedRef.current = false;
    } catch (err) {
      setNotes([]);
      setError(err instanceof Error ? err.message : 'Failed to load client notes');
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    setNotes([]);
    setError(null);
    if (!clientId) return;
    void refetch();
  }, [clientId, refetch]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    const channel = supabase
      .channel(`client-notes:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_notes', filter: `client_id=eq.${clientId}` }, () => {
        if (cancelled || failedRef.current) return;
        void refetch();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [clientId, refetch]);

  const markRead = useCallback(async (noteId: string) => {
    const result = await markClientNoteRead(noteId);
    if (result.success) {
      const readAt = new Date().toISOString();
      setNotes((current) => current.map((note) => (
        note.id === noteId ? { ...note, read_at: note.read_at || readAt } : note
      )));
    }
    return result;
  }, []);

  return { notes, loading, error, refetch, markRead };
}
