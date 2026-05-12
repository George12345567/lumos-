import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientProjects, type Project } from '@/services/projectService';

const projectsCache = new Map<string, Project[]>();

export function useClientProjects(clientId: string | undefined) {
  const cached = clientId ? projectsCache.get(clientId) : undefined;
  const [projects, setProjects] = useState<Project[]>(() => cached ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!clientId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(!projectsCache.has(clientId));
    setError(null);
    try {
      const nextProjects = await fetchClientProjects(clientId);
      projectsCache.set(clientId, nextProjects);
      setProjects(nextProjects);
      failedRef.current = false;
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      failedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    setError(null);

    if (!clientId) return;
    const nextCached = projectsCache.get(clientId);
    setProjects(nextCached ?? []);
    setLoading(!nextCached);
    void refetch();
  }, [clientId, refetch]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    const reload = () => {
      if (cancelled || failedRef.current) return;
      void refetch();
    };

    const channel = supabase
      .channel(`client-projects:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `client_id=eq.${clientId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_services', filter: `client_id=eq.${clientId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_assets', filter: `client_id=eq.${clientId}` }, reload)
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [clientId, refetch]);

  return { projects, loading, error, refetch };
}
