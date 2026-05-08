const FLOW = [
  { key: 'new', en: 'Received', ar: 'تم الاستلام' },
  { key: 'reviewing', en: 'Review', ar: 'المراجعة' },
  { key: 'approved', en: 'Approval', ar: 'الاعتماد' },
  { key: 'converted', en: 'Project', ar: 'المشروع' },
  { key: 'delivered', en: 'Delivered', ar: 'التسليم' },
];

export function normalizeRequestStatus(status?: string | null) {
  if (status === 'completed') return 'delivered';
  if (status === 'delivered') return 'delivered';
  return status || 'new';
}

export function requestStatusIndex(status?: string | null) {
  const normalized = normalizeRequestStatus(status);
  if (normalized === 'cancelled' || normalized === 'rejected') return -1;
  if (normalized === 'new') return 0;
  if (normalized === 'reviewing') return 1;
  if (normalized === 'approved') return 2;
  if (normalized === 'converted') return 3;
  if (normalized === 'delivered') return 4;
  return 0;
}

export function requestStatusLabel(status?: string | null, isArabic = false) {
  const normalized = normalizeRequestStatus(status);
  if (normalized === 'cancelled') return isArabic ? 'ملغي' : 'Cancelled';
  if (normalized === 'rejected') return isArabic ? 'مرفوض' : 'Rejected';
  const step = FLOW.find((item) => item.key === normalized) || FLOW[0];
  return isArabic ? step.ar : step.en;
}

export { FLOW as REQUEST_STATUS_FLOW };
