import { supabase } from '@/lib/supabaseClient';
import type { DiscountBreakdown, PricingRequestItem, StatusHistoryEntry } from '@/types/dashboard';

export const GUEST_DUPLICATE_MESSAGE_EN =
  'These details are already connected to a previous request or account. Please sign in, use another contact method, or contact Lumos support.';

export const GUEST_DUPLICATE_MESSAGE_AR =
  'البيانات دي مرتبطة بطلب أو حساب سابق. من فضلك سجّل الدخول، استخدم بيانات تواصل مختلفة، أو تواصل مع فريق Lumos.';

export type GuestTrackableStatus =
  | 'new'
  | 'reviewing'
  | 'approved'
  | 'converted'
  | 'rejected'
  | 'cancelled';

export interface GuestTrackedRequest {
  invoice_number: string;
  status: GuestTrackableStatus;
  request_type: 'package' | 'custom';
  package_name?: string | null;
  selected_services: PricingRequestItem[];
  estimated_subtotal: number;
  discount_breakdown?: DiscountBreakdown;
  applied_promo_code?: string | null;
  estimated_total: number;
  price_currency: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  company_name?: string | null;
  request_notes?: string | null;
  status_history?: StatusHistoryEntry[];
  created_at: string;
  updated_at?: string | null;
  guest_tracking_created_at?: string | null;
  guest_tracking_last_used_at?: string | null;
  guest_last_accessed_at?: string | null;
  can_edit: boolean;
  next_step?: string;
}

export interface CreateGuestPricingRequestPayload {
  request_type: 'package' | 'custom';
  package_id?: string | null;
  package_name: string;
  selected_services: PricingRequestItem[];
  estimated_subtotal: number;
  estimated_total: number;
  price_currency: string;
  request_notes?: string | null;
  guest_contact: {
    name: string;
    phone: string;
    email?: string | null;
  };
  company_name?: string | null;
  location_url?: string | null;
  discount_breakdown?: DiscountBreakdown;
  applied_promo_code?: string | null;
}

export interface GuestActionResult {
  success: boolean;
  request?: GuestTrackedRequest;
  trackingKey?: string;
  error?: string;
}

export function buildGuestTrackingUrl(invoiceNumber: string, trackingKey?: string) {
  const params = new URLSearchParams();
  if (invoiceNumber) params.set('invoice', invoiceNumber);
  if (trackingKey) params.set('key', trackingKey);
  return `${window.location.origin}/track-request?${params.toString()}`;
}

function normalizeRpcError(error?: string | null) {
  if (!error) return 'guest_tracking_failed';
  return error;
}

export async function checkGuestContactAvailability(contact: {
  email?: string | null;
  phone?: string | null;
}): Promise<{ available: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('check_guest_contact_available', {
    p_guest_email: contact.email || null,
    p_guest_phone: contact.phone || null,
  });

  if (error) {
    return { available: true, error: error.message };
  }

  const result = data as { available?: boolean; error?: string } | null;
  return {
    available: result?.available !== false,
    error: result?.error,
  };
}

export async function createGuestPricingRequest(
  payload: CreateGuestPricingRequestPayload,
): Promise<GuestActionResult> {
  const { data, error } = await supabase.rpc('create_guest_pricing_request', {
    p_request: payload,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as {
    success?: boolean;
    request?: GuestTrackedRequest;
    tracking_key?: string;
    error?: string;
  } | null;

  if (!result?.success) {
    return { success: false, error: normalizeRpcError(result?.error) };
  }

  return {
    success: true,
    request: result.request,
    trackingKey: result.tracking_key,
  };
}

export async function verifyGuestTracking(input: {
  invoiceNumber: string;
  trackingKey: string;
}): Promise<GuestActionResult> {
  const { data, error } = await supabase.rpc('verify_guest_tracking', {
    p_invoice_number: input.invoiceNumber,
    p_tracking_key: input.trackingKey,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success?: boolean; request?: GuestTrackedRequest; error?: string } | null;
  if (!result?.success) {
    return { success: false, error: normalizeRpcError(result?.error) };
  }

  return { success: true, request: result.request };
}

export async function guestUpdateRequest(input: {
  invoiceNumber: string;
  trackingKey: string;
  updates: Record<string, unknown>;
}): Promise<GuestActionResult> {
  const { data, error } = await supabase.rpc('guest_update_request', {
    p_invoice_number: input.invoiceNumber,
    p_tracking_key: input.trackingKey,
    p_updates: input.updates,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success?: boolean; request?: GuestTrackedRequest; error?: string } | null;
  if (!result?.success) {
    return { success: false, request: result?.request, error: normalizeRpcError(result?.error) };
  }

  return { success: true, request: result.request };
}
