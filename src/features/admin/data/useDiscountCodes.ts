import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { DiscountCode } from '@/types/dashboard';
import { toast } from 'sonner';

export function useDiscountCodes() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodes((data as DiscountCode[]) || []);
    } catch (err) {
      console.error('useDiscountCodes failed:', err);
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCode = useCallback(
    async (input: Partial<DiscountCode>) => {
      try {
        const { error } = await supabase.from('discount_codes').insert([
          {
            code: (input.code || '').toUpperCase(),
            description: input.description || null,
            discount_type: input.discount_type || 'percentage',
            discount_value: input.discount_value ?? 0,
            min_order_value: input.min_order_value ?? 0,
            max_discount: input.max_discount ?? 0,
            is_active: input.is_active ?? true,
            valid_until: input.valid_until || null,
            usage_limit: input.usage_limit ?? 0,
            usage_count: 0,
          },
        ]);
        if (error) throw error;
        toast.success('Discount code created');
        await refresh();
        return { success: true as const };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create code';
        toast.error(message);
        return { success: false as const, error: message };
      }
    },
    [refresh],
  );

  const updateCode = useCallback(async (id: string, updates: Partial<DiscountCode>) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Discount code updated');
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update code';
      toast.error(message);
      return { success: false as const, error: message };
    }
  }, []);

  const deleteCode = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Discount code deleted');
      setCodes((prev) => prev.filter((c) => c.id !== id));
      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete code';
      toast.error(message);
      return { success: false as const, error: message };
    }
  }, []);

  return { codes, loading, refresh, createCode, updateCode, deleteCode };
}
