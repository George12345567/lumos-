export type AdminI18nKey =
  | 'overview'
  | 'orders'
  | 'pricing'
  | 'inbox'
  | 'clients'
  | 'designs'
  | 'guide'
  | 'refreshing'
  | 'refreshData'
  | 'navigation'
  | 'tools'
  | 'livePreviewTool'
  | 'adminCenter'
  | 'quickSearch'
  | 'noResultsFor'
  | 'loadingDashboard'
  | 'goodDayGeorge'
  | 'todaySummary'
  | 'allSystemsOnline'
  | 'addClient'
  | 'addFirstClient'
  | 'searchByNameUsername'
  | 'noMatchingClients'
  | 'noClientsYet'
  | 'createClient'
  | 'creating'
  | 'cancel'
  | 'addNewClient'
  | 'createNewClientAccount'
  | 'usernameRequired'
  | 'passwordRequired'
  | 'passwordCopied'
  | 'username'
  | 'companyName'
  | 'status'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'packageOptional'
  | 'password'
  | 'shareTempPassword'
  | 'searchRequesterPackage'
  | 'pricingRequests'
  | 'requestPipeline'
  | 'new'
  | 'reviewing'
  | 'approved'
  | 'converted'
  | 'rejected'
  | 'saveNotes'
  | 'saving'
  | 'openClientControl'
  | 'review'
  | 'approve'
  | 'reject'
  | 'convertToOrder'
  | 'noPricingRequestsMatch'
  | 'signOut'
  | 'profileSaved'
  | 'saveFailed'
  | 'uploadFailed'
  | 'profilePhotoUpdated'
  | 'uploadNewPhoto'
  | 'uploading'
  | 'saveChanges'
  | 'savingProfile'
  | 'inboxLeads'
  | 'newCount'
  | 'markRead'
  | 'noMessages'
  | 'pendingOrders'
  | 'processingOrders'
  | 'completedOrders'
  | 'cancelledOrders'
  | 'noOrders'
  | 'advanceStatus'
  | 'unreadChats'
  | 'actionRequired'
  | 'allCaughtUp'
  | 'totalRevenue'
  | 'avgOrderValue'
  | 'totalOrders'
  | 'completedAndPending'
  | 'newContacts'
  | 'totalContacts';

const dict: Record<AdminI18nKey, { en: string; ar: string }> = {
  overview: { en: 'Overview', ar: 'نظرة عامة' },
  orders: { en: 'Orders', ar: 'الطلبات' },
  pricing: { en: 'Pricing', ar: 'التسعير' },
  inbox: { en: 'Inbox', ar: 'الوارد' },
  clients: { en: 'Clients', ar: 'العملاء' },
  designs: { en: 'Designs', ar: 'التصاميم' },
  guide: { en: 'Guide', ar: 'الدليل' },
  refreshing: { en: 'Refreshing...', ar: 'جارٍ التحديث...' },
  refreshData: { en: 'Refresh Data', ar: 'تحديث البيانات' },
  navigation: { en: 'Navigation', ar: 'التنقل' },
  tools: { en: 'Tools', ar: 'الأدوات' },
  livePreviewTool: { en: 'Live Preview Tool', ar: 'أداة المعاينة الحية' },
  adminCenter: { en: 'Admin Center', ar: 'مركز الإدارة' },
  quickSearch: { en: 'Quick search clients, designs...', ar: 'بحث سريع في العملاء والتصاميم...' },
  noResultsFor: { en: 'No results found for', ar: 'لا توجد نتائج لـ' },
  loadingDashboard: { en: 'Loading dashboard...', ar: 'جارٍ تحميل لوحة التحكم...' },
  goodDayGeorge: { en: 'Good day, George 👋', ar: 'يومك سعيد يا George 👋' },
  todaySummary: { en: "Here's what's happening with Lumos today", ar: 'هذه أبرز تحديثات Lumos اليوم' },
  allSystemsOnline: { en: 'All systems online', ar: 'كل الأنظمة تعمل' },
  addClient: { en: 'Add Client', ar: 'إضافة عميل' },
  addFirstClient: { en: 'Add First Client', ar: 'إضافة أول عميل' },
  searchByNameUsername: { en: 'Search by name or username', ar: 'ابحث بالاسم أو اسم المستخدم' },
  noMatchingClients: { en: 'No matching clients', ar: 'لا يوجد عملاء مطابقون' },
  noClientsYet: { en: 'No clients yet', ar: 'لا يوجد عملاء بعد' },
  createClient: { en: 'Create Client', ar: 'إنشاء عميل' },
  creating: { en: 'Creating...', ar: 'جارٍ الإنشاء...' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  addNewClient: { en: 'Add New Client', ar: 'إضافة عميل جديد' },
  createNewClientAccount: { en: 'Create a new client account', ar: 'إنشاء حساب عميل جديد' },
  usernameRequired: { en: 'Username is required', ar: 'اسم المستخدم مطلوب' },
  passwordRequired: { en: 'Password is required', ar: 'كلمة المرور مطلوبة' },
  passwordCopied: { en: 'Password copied!', ar: 'تم نسخ كلمة المرور' },
  username: { en: 'Username', ar: 'اسم المستخدم' },
  companyName: { en: 'Company Name', ar: 'اسم الشركة' },
  status: { en: 'Status', ar: 'الحالة' },
  active: { en: 'Active', ar: 'نشط' },
  pending: { en: 'Pending', ar: 'معلق' },
  suspended: { en: 'Suspended', ar: 'موقوف' },
  packageOptional: { en: 'Package (optional)', ar: 'الباقة (اختياري)' },
  password: { en: 'Password', ar: 'كلمة المرور' },
  shareTempPassword: { en: 'Share this temporary password with your client securely.', ar: 'شارك كلمة المرور المؤقتة مع العميل بطريقة آمنة.' },
  searchRequesterPackage: { en: 'Search requester, package, note, phone', ar: 'ابحث في مقدم الطلب أو الباقة أو الملاحظات أو الهاتف' },
  pricingRequests: { en: 'Pricing Requests', ar: 'طلبات التسعير' },
  requestPipeline: { en: 'Request Pipeline', ar: 'مسار الطلبات' },
  new: { en: 'New', ar: 'جديد' },
  reviewing: { en: 'Reviewing', ar: 'قيد المراجعة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  converted: { en: 'Converted', ar: 'تم التحويل' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  saveNotes: { en: 'Save Notes', ar: 'حفظ الملاحظات' },
  saving: { en: 'Saving...', ar: 'جارٍ الحفظ...' },
  openClientControl: { en: 'Open Client Control', ar: 'فتح تحكم العميل' },
  review: { en: 'Review', ar: 'مراجعة' },
  approve: { en: 'Approve', ar: 'اعتماد' },
  reject: { en: 'Reject', ar: 'رفض' },
  convertToOrder: { en: 'Convert to Order', ar: 'تحويل إلى طلب' },
  noPricingRequestsMatch: { en: 'No pricing requests match this view', ar: 'لا توجد طلبات تسعير مطابقة لهذا العرض' },
  signOut: { en: 'Sign out', ar: 'تسجيل الخروج' },
  profileSaved: { en: 'Profile saved.', ar: 'تم حفظ الملف الشخصي.' },
  saveFailed: { en: 'Save failed. Please try again.', ar: 'فشل الحفظ. حاول مرة أخرى.' },
  uploadFailed: { en: 'Upload failed.', ar: 'فشل الرفع.' },
  profilePhotoUpdated: { en: 'Profile photo updated.', ar: 'تم تحديث صورة الملف الشخصي.' },
  uploadNewPhoto: { en: 'Upload New Photo', ar: 'رفع صورة جديدة' },
  uploading: { en: 'Uploading...', ar: 'جارٍ الرفع...' },
  saveChanges: { en: 'Save changes', ar: 'حفظ التغييرات' },
  savingProfile: { en: 'Saving profile', ar: 'جارٍ حفظ الملف' },
  inboxLeads: { en: 'Inbox & Leads', ar: 'الوارد والعملاء المحتملون' },
  newCount: { en: 'New', ar: 'جديد' },
  markRead: { en: 'Mark Read', ar: 'تحديد كمقروء' },
  noMessages: { en: 'No messages', ar: 'لا توجد رسائل' },
  pendingOrders: { en: 'Pending', ar: 'قيد الانتظار' },
  processingOrders: { en: 'Processing', ar: 'قيد التنفيذ' },
  completedOrders: { en: 'Completed', ar: 'مكتمل' },
  cancelledOrders: { en: 'Cancelled', ar: 'ملغي' },
  noOrders: { en: 'No orders', ar: 'لا توجد طلبات' },
  advanceStatus: { en: 'Advance Status', ar: 'نقل الحالة' },
  unreadChats: { en: 'Unread Chats', ar: 'الدردشات غير المقروءة' },
  actionRequired: { en: 'Action Required', ar: 'يتطلب إجراء' },
  allCaughtUp: { en: 'All caught up', ar: 'كل شيء تحت السيطرة' },
  totalRevenue: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  avgOrderValue: { en: 'Avg. {value} EGP/Order', ar: 'متوسط {value} ج.م لكل طلب' },
  totalOrders: { en: 'Total Orders', ar: 'إجمالي الطلبات' },
  completedAndPending: { en: '{completed} Completed · {pending} Pending', ar: '{completed} مكتمل · {pending} قيد الانتظار' },
  newContacts: { en: 'New Contacts', ar: 'جهات اتصال جديدة' },
  totalContacts: { en: '{value} Total Contacts', ar: '{value} إجمالي جهات الاتصال' },
};

export const adminText = (key: AdminI18nKey, isArabic: boolean) => (isArabic ? dict[key].ar : dict[key].en);
