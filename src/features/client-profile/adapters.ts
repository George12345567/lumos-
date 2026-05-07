import type { ClientNotification } from './hooks/useNotifications';
import type { ClientOrder } from './hooks/useOrders';
import type { PortalAsset } from './hooks/usePortalData';
import type { MockOrder, MockAsset, AdminNotification } from './mockData';

export function adaptNotification(n: ClientNotification): AdminNotification {
  return {
    id: n.id,
    message: n.message,
    messageAr: n.messageAr ?? '',
    type: n.type,
    created_at: n.created_at,
    is_read: n.is_read,
  };
}

export function adaptOrder(o: ClientOrder): MockOrder {
  const statusOrder = ['pending', 'reviewing', 'approved', 'in_progress', 'delivered'] as const;
  const labels: Record<string, { label: string; labelAr: string }> = {
    pending: { label: 'Order Placed', labelAr: 'تم تقديم الطلب' },
    reviewing: { label: 'Under Review', labelAr: 'قيد المراجعة' },
    approved: { label: 'Approved', labelAr: 'تمت الموافقة' },
    in_progress: { label: 'In Progress', labelAr: 'قيد التنفيذ' },
    delivered: { label: 'Delivered', labelAr: 'تم التسليم' },
    cancelled: { label: 'Cancelled', labelAr: 'ملغي' },
  };
  const currentIdx = statusOrder.indexOf(o.status as 'pending' | 'reviewing' | 'approved' | 'in_progress' | 'delivered');
  const timeline = statusOrder.map((s, i) => ({
    status: s,
    label: labels[s]?.label ?? s,
    labelAr: labels[s]?.labelAr ?? s,
    date: i <= currentIdx ? o.created_at.slice(0, 10) : '',
    completed: i < currentIdx,
    active: i === currentIdx,
  }));

  return {
    id: o.id,
    order_type: o.order_type || 'package',
    package_name: o.package_name || 'Order',
    package_name_ar: o.package_name || 'طلب',
    status: o.status as MockOrder['status'],
    total_price: o.total_price,
    price_currency: o.price_currency || 'EGP',
    created_at: o.created_at,
    updated_at: o.updated_at || o.created_at,
    estimated_delivery: '',
    items: (o.selected_services ?? []).map((s) => ({
      name: s.name,
      nameAr: s.nameAr ?? s.name,
      price: s.price,
      category: s.category ?? 'web',
    })),
    notes: o.notes ?? '',
    timeline,
  };
}

export function adaptAsset(a: PortalAsset): MockAsset {
  const ext = a.name?.split('.').pop()?.toUpperCase() ?? '';
  const typeMap: Record<string, MockAsset['asset_type']> = {
    PDF: 'pdf', SVG: 'image', PNG: 'image', JPG: 'image', JPEG: 'image',
    FIG: 'design', ZIP: 'archive', RAR: 'archive',
    DOC: 'document', DOCX: 'document', TXT: 'document',
    VIDEO: 'video', MP4: 'video',
    XLS: 'spreadsheet', XLSX: 'spreadsheet', CSV: 'spreadsheet',
  };
  return {
    id: a.id,
    name: a.name ?? 'File',
    asset_url: a.asset_url,
    asset_type: typeMap[ext] ?? 'document',
    file_type: ext || 'FILE',
    size: '',
    uploaded_by: 'admin' as const,
    created_at: a.created_at ?? '',
  };
}