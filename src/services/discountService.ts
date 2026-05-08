import { supabase } from '@/lib/supabaseClient';
import type { DiscountCode } from '@/types/dashboard';

export type { DiscountCode };

export interface DiscountValidationContext {
  subtotal?: number;
  packageId?: string | null;
  selectedServices?: Array<{ id?: string; category?: string }> | string[];
  serviceCategories?: string[];
}

export interface DiscountCodeResult {
  success: boolean;
  data?: DiscountCode;
  error?: string;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

const failureMessage = (reason?: string) => {
  switch (reason) {
    case 'empty':
      return 'Enter a discount code.';
    case 'inactive':
      return 'This discount code is inactive.';
    case 'expired':
      return 'This discount code has expired.';
    case 'not_started':
      return 'This discount code is not active yet.';
    case 'usage_limit_reached':
      return 'This discount code has reached its usage limit.';
    case 'not_applicable':
      return 'This discount code does not apply to this package/services.';
    case 'invalid':
    default:
      return 'This discount code is invalid.';
  }
};

const getServiceIds = (services?: DiscountValidationContext['selectedServices']) =>
  (services ?? [])
    .map((service) => (typeof service === 'string' ? service : service.id))
    .filter((value): value is string => Boolean(value));

const getServiceCategories = (context?: DiscountValidationContext) => {
  const fromServices = (context?.selectedServices ?? [])
    .map((service) => (typeof service === 'string' ? null : service.category))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set([...(context?.serviceCategories ?? []), ...fromServices].filter(Boolean)));
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
};

const calculateDiscountAmount = (discountCode: DiscountCode, subtotal = 0) => {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  let discountAmount = 0;

  if (discountCode.discount_type === 'percentage') {
    discountAmount = safeSubtotal * (Number(discountCode.discount_value) / 100);
  } else {
    discountAmount = Number(discountCode.discount_value) || 0;
  }

  if (discountCode.max_discount && discountAmount > discountCode.max_discount) {
    discountAmount = discountCode.max_discount;
  }

  return Math.min(Math.max(0, discountAmount), safeSubtotal);
};

const toDiscountCode = (data: Record<string, unknown>): DiscountCode => ({
  id: String(data.id ?? data.code ?? ''),
  code: String(data.code ?? '').toUpperCase(),
  description: typeof data.description === 'string' ? data.description : undefined,
  discount_type: data.discount_type === 'fixed' ? 'fixed' : 'percentage',
  discount_value: Number(data.discount_value) || 0,
  min_order_value: data.min_order_value == null ? undefined : Number(data.min_order_value),
  max_discount: data.max_discount == null ? undefined : Number(data.max_discount),
  is_active: Boolean(data.is_active ?? true),
  valid_from: typeof data.valid_from === 'string' ? data.valid_from : undefined,
  valid_until: typeof data.valid_until === 'string' ? data.valid_until : undefined,
  usage_limit: data.usage_limit == null ? undefined : Number(data.usage_limit),
  usage_count: data.usage_count == null ? undefined : Number(data.usage_count),
  applicable_categories: asStringArray(data.applicable_categories),
  applicable_packages: asStringArray(data.applicable_packages),
  applicable_services: asStringArray(data.applicable_services),
  created_at: typeof data.created_at === 'string' ? data.created_at : undefined,
  updated_at: typeof data.updated_at === 'string' ? data.updated_at : undefined,
});

const validateWithRpc = async (
  code: string,
  context?: DiscountValidationContext,
): Promise<DiscountCodeResult | null> => {
  const { data, error } = await supabase.rpc('validate_discount_code', {
    p_code: code,
    p_subtotal: Math.max(0, Number(context?.subtotal) || 0),
    p_package_id: context?.packageId ?? null,
    p_service_ids: getServiceIds(context?.selectedServices),
    p_service_categories: getServiceCategories(context),
  });

  if (error) {
    if (/validate_discount_code|function/i.test(error.message ?? '')) {
      return null;
    }
    console.error('Discount RPC validation failed:', error);
    return { success: false, error: 'Failed to validate discount code.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  if (!row.success) {
    return { success: false, error: failureMessage(row.error) };
  }

  return {
    success: true,
    data: toDiscountCode({
      id: row.id ?? row.code,
      code: row.code,
      description: row.description,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      max_discount: row.max_discount,
      is_active: true,
    }),
  };
};

export const validateDiscountCode = async (
  code: string,
  context?: DiscountValidationContext,
): Promise<DiscountCodeResult> => {
  try {
    const normalized = normalizeCode(code);
    if (!normalized) return { success: false, error: failureMessage('empty') };

    const rpcResult = await validateWithRpc(normalized, context);
    if (rpcResult) return rpcResult;

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .ilike('code', normalized)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: failureMessage('invalid') };
    }

    const discountCode = toDiscountCode(data as Record<string, unknown>);
    const record = data as Record<string, unknown>;
    const now = new Date();

    if (!discountCode.is_active) {
      return { success: false, error: failureMessage('inactive') };
    }

    if (discountCode.valid_until) {
      const validUntil = new Date(discountCode.valid_until);
      if (now > validUntil) {
        return { success: false, error: failureMessage('expired') };
      }
    }

    if (discountCode.valid_from) {
      const validFrom = new Date(discountCode.valid_from);
      if (now < validFrom) {
        return { success: false, error: failureMessage('not_started') };
      }
    }

    if (discountCode.usage_limit && (discountCode.usage_count ?? 0) >= discountCode.usage_limit) {
      return { success: false, error: failureMessage('usage_limit_reached') };
    }

    const subtotal = Math.max(0, Number(context?.subtotal) || 0);
    if (subtotal <= 0) {
      return { success: false, error: failureMessage('not_applicable') };
    }
    if (discountCode.min_order_value && subtotal < discountCode.min_order_value) {
      return { success: false, error: failureMessage('not_applicable') };
    }

    const packageRestrictions = asStringArray(record.applicable_packages);
    if (packageRestrictions.length > 0 && (!context?.packageId || !packageRestrictions.includes(context.packageId))) {
      return { success: false, error: failureMessage('not_applicable') };
    }

    const serviceRestrictions = asStringArray(record.applicable_services);
    const serviceIds = getServiceIds(context?.selectedServices);
    if (serviceRestrictions.length > 0 && serviceIds.every((id) => !serviceRestrictions.includes(id))) {
      return { success: false, error: failureMessage('not_applicable') };
    }

    const categoryRestrictions = discountCode.applicable_categories ?? [];
    const categories = getServiceCategories(context);
    if (categoryRestrictions.length > 0 && categories.every((category) => !categoryRestrictions.includes(category))) {
      return { success: false, error: failureMessage('not_applicable') };
    }

    if (calculateDiscountAmount(discountCode, subtotal) <= 0 && subtotal > 0) {
      return { success: false, error: failureMessage('not_applicable') };
    }

    return { success: true, data: discountCode };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return { success: false, error: 'Failed to validate discount code.' };
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

  return { success: true, discountValue: Math.min(Math.max(0, discountValue), Math.max(0, orderValue)) };
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
