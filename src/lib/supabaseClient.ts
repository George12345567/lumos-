import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: unknown) => ({
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            order: (column: string, options?: { ascending?: boolean }) => ({
              limit: (n: number) => ({
                then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
                promise: () => Promise.resolve({ data: [], error: null }),
              }),
              then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
              promise: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          like: (column: string, pattern: string) => ({
            order: (column: string, options?: { ascending?: boolean }) => ({
              limit: (n: number) => ({
                then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
                promise: () => Promise.resolve({ data: [], error: null }),
              }),
              then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
              promise: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          in: (column: string, values: unknown[]) => ({
            order: (column: string, options?: { ascending?: boolean }) => ({
              limit: (n: number) => ({
                then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
                promise: () => Promise.resolve({ data: [], error: null }),
              }),
              then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
              promise: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          order: (column: string, options?: { ascending?: boolean }) => ({
            limit: (n: number) => ({
              then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
              promise: () => Promise.resolve({ data: [], error: null }),
            }),
            then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: [], error: null }),
            promise: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        insert: (data: unknown) => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
        update: (data: unknown) => ({
          eq: (column: string, value: unknown) => ({
            select: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        delete: () => ({
          eq: (column: string, value: unknown) => ({
            then: (cb: (res: { data: unknown; error: unknown }) => void) => cb({ data: null, error: null }),
            promise: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, file: unknown) => ({ data: null, error: null }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: "" } }),
        }),
      },
    };