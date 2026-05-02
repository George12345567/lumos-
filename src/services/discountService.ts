import { supabase } from '@/lib/supabaseClient';
import type { DiscountCode } from '@/types/dashboard';

export interface DiscountCodeResult {
  success: boolean;
  data?: DiscountCode;
  error?: string;
}

export const validateDiscountCode = async (code: string): Promise<DiscountCodeResult> => {
  try {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid or expired promo code' };
    }

    const now = new Date();
    
    if (data.valid_until) {
      const validUntil = new Date(data.valid_until);
      if (now > validUntil) {
        return { success: false, error: 'This promo code has expired' };
      }
    }

    if (data.valid_from) {
      const validFrom = new Date(data.valid_from);
      if (now < validFrom) {
        return { success: false, error: 'This promo code is not yet active' };
      }
    }

    if (data.usage_limit && data.usage_count >= data.usage_limit) {
      return { success: false, error: 'This promo code has reached its usage limit' };
    }

    return {
      success: true,
      data: {
        id: data.id,
        code: data.code,
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: data.min_order_value,
        max_discount: data.max_discount,
        is_active: data.is_active,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        usage_limit: data.usage_limit,
        usage_count: data.usage_count,
        applicable_categories: data.applicable_categories,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return { success: false, error: 'Failed to validate promo code' };
  }
};

export const applyDiscountCode = async (
  code: string,
  orderValue: number
): Promise<{ success: boolean; discountValue?: number; error?: string }> => {
  const validation = await validateDiscountCode(code);

  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const discountCode = validation.data;

  if (discountCode.min_order_value && orderValue < discountCode.min_order_value) {
    return {
      success: false,
      error: `Minimum order value for this code is ${discountCode.min_order_value}`
    };
  }

  let discountValue = 0;

  if (discountCode.discount_type === 'percentage') {
    discountValue = orderValue * (discountCode.discount_value / 100);
    if (discountCode.max_discount && discountValue > discountCode.max_discount) {
      discountValue = discountCode.max_discount;
    }
  } else {
    discountValue = discountCode.discount_value;
    if (discountCode.max_discount && discountValue > discountCode.max_discount) {
      discountValue = discountCode.max_discount;
    }
  }

  await incrementDiscountUsage(discountCode.id);

  return { success: true, discountValue };
};

const incrementDiscountUsage = async (codeId: string): Promise<void> => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('discount_codes')
      .select('usage_count')
      .eq('id', codeId)
      .single();

    if (fetchError) {
      console.warn('Could not fetch current usage count:', fetchError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('discount_codes')
      .update({ 
        usage_count: (current?.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', codeId);

    if (updateError) {
      console.warn('Could not increment discount usage:', updateError.message);
    }
  } catch (error) {
    console.warn('Error incrementing discount usage:', error);
  }
};

export const getAllActiveDiscountCodes = async (): Promise<DiscountCode[]> => {
  try {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as DiscountCode[]) || [];
  } catch (error) {
    console.error('Error getting discount codes:', error);
    return [];
  }
};

export const createDiscountCode = async (codeData: {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  valid_until?: string;
  usage_limit?: number;
  applicable_categories?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('discount_codes')
      .insert({
        code: codeData.code.toUpperCase(),
        description: codeData.description,
        discount_type: codeData.discount_type,
        discount_value: codeData.discount_value,
        min_order_value: codeData.min_order_value || 0,
        max_discount: codeData.max_discount,
        is_active: true,
        valid_until: codeData.valid_until,
        usage_limit: codeData.usage_limit,
        usage_count: 0,
        applicable_categories: codeData.applicable_categories,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating discount code:', error);
    return { success: false, error: errorMessage };
  }
};

export const deactivateDiscountCode = async (codeId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('discount_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', codeId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const deleteDiscountCode = async (codeId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', codeId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};