import { supabase } from '@/lib/supabaseClient';
import type { PricingRequest, PricingRequestItem, DiscountBreakdown } from '@/types/dashboard';
import { logAuditChange } from './auditService';
import { createNotification } from './notificationService';

interface SubmitPricingRequestParams {
  requestId?: string | null;
  clientId?: string;
  requestType: 'package' | 'custom';
  packageId?: string | null;
  packageName: string;
  selectedServices: PricingRequestItem[];
  estimatedSubtotal: number;
  estimatedTotal: number;
  priceCurrency: string;
  requestNotes?: string;
  guestContact?: {
    name: string;
    phone: string;
    email?: string;
  };
  locationUrl?: string;
  discountBreakdown?: DiscountBreakdown;
  appliedPromoCode?: string;
}

export const submitPricingRequest = async (data: SubmitPricingRequestParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const { requestId, clientId, requestType, packageId, packageName, selectedServices, estimatedSubtotal, estimatedTotal, priceCurrency, requestNotes, guestContact, locationUrl, discountBreakdown, appliedPromoCode } = data;

    const now = new Date().toISOString();

    const requestData = {
      client_id: clientId || null,
      request_type: requestType,
      status: 'new',
      priority: 'medium',
      package_id: packageId,
      package_name: packageName,
      selected_services: selectedServices,
      estimated_subtotal: estimatedSubtotal,
      estimated_total: estimatedTotal,
      price_currency: priceCurrency,
      discount_breakdown: discountBreakdown || { base_discount: 0, promo_discount: 0, reward_discount: 0, total_discount_percent: 0 },
      applied_promo_code: appliedPromoCode || null,
      guest_name: guestContact?.name || null,
      guest_phone: guestContact?.phone || null,
      guest_email: guestContact?.email || null,
      request_notes: requestNotes || null,
      location_url: locationUrl || null,
      status_history: [{ status: 'new', changed_at: now, changed_by: null, note: 'Request submitted' }],
      created_at: now,
      updated_at: now,
    };

    let result;

    if (requestId) {
      const { data: updatedData, error: updateError } = await supabase
        .from('pricing_requests')
        .update({
          ...requestData,
          updated_at: now,
          status_history: [
            { status: 'new', changed_at: now, changed_by: null, note: 'Request resubmitted' }
          ]
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updatedData;

      await logAuditChange({
        entityType: 'pricing_request',
        entityId: requestId,
        changedBy: clientId || null,
        changedByType: clientId ? 'client' : 'system',
        action: 'updated',
        oldValues: null,
        newValues: requestData,
        changeSummary: 'Pricing request updated and resubmitted',
        changeSummaryAr: 'تم تحديث طلب التسعير وإعادة إرساله'
      });
    } else {
      const { data: insertedData, error: insertError } = await supabase
        .from('pricing_requests')
        .insert(requestData)
        .select()
        .single();

      if (insertError) throw insertError;
      result = insertedData;

      await logAuditChange({
        entityType: 'pricing_request',
        entityId: result.id,
        changedBy: clientId || null,
        changedByType: clientId ? 'client' : 'system',
        action: 'created',
        oldValues: null,
        newValues: requestData,
        changeSummary: 'New pricing request submitted',
        changeSummaryAr: 'تم تقديم طلب تسعير جديد'
      });

      if (clientId) {
        await createNotification({
          userId: clientId,
          userType: 'client',
          type: 'pricing_request_new',
          title: 'Pricing Request Received',
          titleAr: 'تم استلام طلب التسعير',
          message: 'Your pricing request has been received and is under review.',
          messageAr: 'تم استلام طلب التسعير الخاص بك قيد المراجعة.',
          actionType: 'pricing_request',
          actionId: result.id,
          priority: 'normal'
        });
      }
    }

    return { success: true, id: result.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting pricing request:', error);
    return { success: false, error: errorMessage };
  }
};

export const getPricingRequest = async (id: string): Promise<PricingRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('pricing_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as PricingRequest;
  } catch (error) {
    console.error('Error getting pricing request:', error);
    return null;
  }
};

export const getClientPricingRequests = async (clientId: string): Promise<PricingRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('pricing_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PricingRequest[]) || [];
  } catch (error) {
    console.error('Error getting client pricing requests:', error);
    return [];
  }
};

export const updatePricingRequestStatus = async (
  id: string,
  status: PricingRequest['status'],
  changedById?: string,
  note?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('pricing_requests')
      .select('status, status_history, client_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const now = new Date().toISOString();
    const historyEntry = {
      status,
      changed_at: now,
      changed_by: changedById || null,
      note: note || null
    };

    const newHistory = current.status_history 
      ? [...current.status_history, historyEntry]
      : [historyEntry];

    const { error: updateError } = await supabase
      .from('pricing_requests')
      .update({
        status,
        status_history: newHistory,
        reviewed_at: status === 'reviewing' || status === 'approved' || status === 'rejected' ? now : null,
        updated_at: now
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: id,
      changedBy: changedById || null,
      changedByType: changedById ? 'team_member' : 'system',
      action: 'status_changed',
      oldValues: { status: current.status },
      newValues: { status },
      changeSummary: `Status changed to ${status}`,
      changeSummaryAr: `تم تغيير الحالة إلى ${status}`
    });

    if (current.client_id) {
      const messages: Record<string, { title: string; titleAr: string; message: string; messageAr: string }> = {
        reviewing: {
          title: 'Request Under Review',
          titleAr: 'طلبك قيد المراجعة',
          message: 'Your pricing request is now being reviewed by our team.',
          messageAr: 'طلب التسعير الخاص بك قيد المراجعة من فريقنا.'
        },
        approved: {
          title: 'Request Approved!',
          titleAr: 'تم اعتماد الطلب!',
          message: 'Great news! Your pricing request has been approved.',
          messageAr: 'أخبار سارة! تم اعتماد طلب التسعير الخاص بك.'
        },
        rejected: {
          title: 'Request Needs Revision',
          titleAr: 'الطلب يحتاج تعديل',
          message: 'Your pricing request needs some adjustments. Please check for updates.',
          messageAr: 'طلب التسعير الخاص بك يحتاج بعض التعديلات. يرجى التحقق من التحديثات.'
        },
        converted: {
          title: 'Request Converted to Order',
          titleAr: 'تم تحويل الطلب لأوردر',
          message: 'Your pricing request has been converted to an active order.',
          messageAr: 'تم تحويل طلب التسعير الخاص بك إلى أوردر نشط.'
        }
      };

      const msg = messages[status];
      if (msg) {
        await createNotification({
          userId: current.client_id,
          userType: 'client',
          type: 'pricing_request_status_changed',
          title: msg.title,
          titleAr: msg.titleAr,
          message: msg.message,
          messageAr: msg.messageAr,
          actionType: 'pricing_request',
          actionId: id,
          priority: status === 'rejected' ? 'high' : 'normal'
        });
      }
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating pricing request status:', error);
    return { success: false, error: errorMessage };
  }
};

export const assignPricingRequest = async (
  requestId: string,
  teamMemberId: string,
  assignedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('pricing_requests')
      .update({
        assigned_to: teamMemberId,
        updated_at: now
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: requestId,
      changedBy: assignedById || null,
      changedByType: assignedById ? 'team_member' : 'system',
      action: 'assigned',
      oldValues: { assigned_to: null },
      newValues: { assigned_to: teamMemberId },
      changeSummary: 'Request assigned to team member',
      changeSummaryAr: 'تم تعيين الطلب لأحد أفراد الفريق'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error assigning pricing request:', error);
    return { success: false, error: errorMessage };
  }
};

export const saveAdminNotes = async (
  requestId: string,
  notes: string,
  savedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('pricing_requests')
      .update({
        admin_notes: notes,
        updated_at: now
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: requestId,
      changedBy: savedById || null,
      changedByType: savedById ? 'team_member' : 'system',
      action: 'notes_added',
      oldValues: null,
      newValues: { admin_notes: notes },
      changeSummary: 'Admin notes added',
      changeSummaryAr: 'تمت إضافة ملاحظات الأدمن'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving admin notes:', error);
    return { success: false, error: errorMessage };
  }
};

export const deletePricingRequest = async (
  id: string,
  deletedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error: deleteError } = await supabase
      .from('pricing_requests')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: id,
      changedBy: deletedById || null,
      changedByType: deletedById ? 'team_member' : 'system',
      action: 'deleted',
      oldValues: null,
      newValues: null,
      changeSummary: 'Pricing request deleted',
      changeSummaryAr: 'تم حذف طلب التسعير'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting pricing request:', error);
    return { success: false, error: errorMessage };
  }
};

export const convertPricingRequestToOrder = async (
  requestId: string,
  convertedById?: string
): Promise<{ success: boolean; orderId?: string; error?: string }> => {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('pricing_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    const now = new Date().toISOString();

    const orderData = {
      pricing_request_id: requestId,
      client_id: request.client_id,
      guest_name: request.guest_name,
      guest_phone: request.guest_phone,
      guest_email: request.guest_email,
      company_name: request.company_name,
      order_type: 'pricing_converted',
      package_id: request.package_id,
      package_name: request.package_name,
      selected_services: request.selected_services,
      total_price: request.estimated_total,
      price_currency: request.price_currency,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: now,
      updated_at: now
    };

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (insertError) throw insertError;

    await supabase
      .from('pricing_requests')
      .update({
        status: 'converted',
        converted_order_id: order.id,
        updated_at: now,
        status_history: [
          ...(request.status_history || []),
          { status: 'converted', changed_at: now, changed_by: convertedById || null, note: 'Converted to order' }
        ]
      })
      .eq('id', requestId);

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: requestId,
      changedBy: convertedById || null,
      changedByType: convertedById ? 'team_member' : 'system',
      action: 'converted',
      oldValues: null,
      newValues: { order_id: order.id },
      changeSummary: 'Pricing request converted to order',
      changeSummaryAr: 'تم تحويل طلب التسعير إلى أوردر'
    });

    if (request.client_id) {
      await createNotification({
        userId: request.client_id,
        userType: 'client',
        type: 'pricing_request_converted',
        title: 'Request Converted to Order',
        titleAr: 'تم تحويل الطلب لأوردر',
        message: 'Your pricing request has been converted to an active order.',
        messageAr: 'تم تحويل طلب التسعير الخاص بك إلى أوردر نشط.',
        actionType: 'order',
        actionId: order.id,
        priority: 'high'
      });
    }

    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error converting pricing request to order:', error);
    return { success: false, error: errorMessage };
  }
};

export const getAllPricingRequests = async (): Promise<PricingRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('pricing_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PricingRequest[]) || [];
  } catch (error) {
    console.error('Error getting all pricing requests:', error);
    return [];
  }
};

export const updatePricingRequestPriority = async (
  requestId: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  updatedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error: updateError } = await supabase
      .from('pricing_requests')
      .update({
        priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'pricing_request',
      entityId: requestId,
      changedBy: updatedById || null,
      changedByType: updatedById ? 'team_member' : 'system',
      action: 'updated',
      oldValues: null,
      newValues: { priority },
      changeSummary: `Priority changed to ${priority}`,
      changeSummaryAr: `تم تغيير الأولوية إلى ${priority}`
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating priority:', error);
    return { success: false, error: errorMessage };
  }
};