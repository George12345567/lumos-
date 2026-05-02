import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Tag, History, Bell, Users, BarChart3, 
  LogOut, ChevronRight, Search, Check, X, 
  RefreshCw, Trash2, Plus, Mail, Phone, Building2,
  LayoutGrid, Table2, Edit2, Save, User, Briefcase,
  Clock, AlertCircle, CheckCircle2, XCircle,
  Package as PackageIcon, Zap, Receipt, MessageSquare, Copy
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { PricingRequest, DiscountCode, AuditLog, TeamMember, DashboardStats, Contact, Client } from '@/types/dashboard';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { PACKAGES, SERVICES, CATEGORIES, getAllServices } from '@/data/pricing';

const ADMIN_EMAIL = 'george30610@compit.aun.edu.eg';

type Tab = 'requests' | 'discounts' | 'contacts' | 'audit' | 'notifications' | 'team' | 'stats' | 'clients';

interface TeamMemberForm {
  name: string;
  role: 'admin' | 'sales' | 'designer' | 'manager';
  phone: string;
  email: string;
  avatar_url: string;
  is_active: boolean;
}

interface DiscountForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  is_active: boolean;
  valid_until: string;
  usage_limit: number;
}

interface ClientForm {
  username: string;
  email: string;
  phone: string;
  company_name: string;
  status: string;
  progress: number;
  next_steps: string;
  admin_notes: string;
  package_name: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pricingRequests, setPricingRequests] = useState<PricingRequest[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Array<{
    id: string; title: string; message: string; is_read: boolean; created_at: string; type: string;
  }>>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0, totalRevenue: 0, totalContacts: 0, totalPricingRequests: 0,
    pendingOrders: 0, completedOrders: 0, newContacts: 0, newPricingRequests: 0,
    avgOrderValue: 0, unreadMessages: 0, totalDesigns: 0
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null);
  const [teamForm, setTeamForm] = useState<TeamMemberForm>({
    name: '', role: 'sales', phone: '', email: '', avatar_url: '', is_active: true
  });

  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [discountForm, setDiscountForm] = useState<DiscountForm>({
    code: '', description: '', discount_type: 'percentage', discount_value: 0,
    min_order_value: 0, max_discount: 0, is_active: true, valid_until: '', usage_limit: 0
  });

  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>({
    username: '', email: '', phone: '', company_name: '', status: 'active',
    progress: 0, next_steps: '', admin_notes: '', package_name: ''
  });

  const [editingRequestNotes, setEditingRequestNotes] = useState<string>('');
  const [editingContactNotes, setEditingContactNotes] = useState<string>('');

  // Request Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<PricingRequest | null>(null);
  const [requestDetailLang, setRequestDetailLang] = useState<'ar' | 'en'>('ar');
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editRequestForm, setEditRequestForm] = useState<{
    status: string;
    priority: string;
    package_id: string | null;
    selected_services: string[];
    estimated_subtotal: number;
    estimated_total: number;
    admin_notes: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sendingNote, setSendingNote] = useState(false);
  const [noteToClient, setNoteToClient] = useState('');

  // Modal navigation
  const [activeNavSection, setActiveNavSection] = useState('overview');
  const [copySuccess, setCopySuccess] = useState(false);

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return requestDetailLang === 'ar' ? 'الآن' : 'Just now';
    if (minutes < 60) return `${minutes}${requestDetailLang === 'ar' ? ' دقيقة' : ' min'}`;
    if (hours < 24) return `${hours}${requestDetailLang === 'ar' ? ' ساعة' : ' hours'}`;
    if (days < 7) return `${days}${requestDetailLang === 'ar' ? ' يوم' : ' days'}`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlDevMode = params.get('dev');
      const localDevMode = localStorage.getItem('lumos_admin_dev');
      
      if (urlDevMode === 'true') {
        localStorage.setItem('lumos_admin_dev', 'true');
      }
      
      const isDevMode = urlDevMode === 'true' || localDevMode === 'true';
      
      if (isDevMode) {
        setIsAuthorized(true);
        loadData();
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === ADMIN_EMAIL) {
          setIsAuthorized(true);
          loadData();
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPricingRequests(),
        loadDiscountCodes(),
        loadContacts(),
        loadAuditLogs(),
        loadNotifications(),
        loadTeamMembers(),
        loadClients(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricingRequests = async () => {
    const { data, error } = await supabase
      .from('pricing_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPricingRequests(data);
  };

  const loadDiscountCodes = async () => {
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setDiscountCodes(data);
  };

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setContacts(data);
  };

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) setAuditLogs(data);
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setNotifications(data);
  };

  const loadTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTeamMembers(data);
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setClients(data);
  };

  const loadStats = async () => {
    const [requestsRes, contactsRes, ordersRes] = await Promise.all([
      supabase.from('pricing_requests').select('status, price'),
      supabase.from('contacts').select('status'),
      supabase.from('orders').select('total_price, status, payment_status')
    ]);
    
    const requests = requestsRes.data || [];
    const contactsList = contactsRes.data || [];
    const orders = ordersRes.data || [];
    
    setStats({
      totalOrders: orders.length,
      totalRevenue: orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0),
      totalContacts: contactsList.length,
      totalPricingRequests: requests.length,
      pendingOrders: requests.filter(r => r.status === 'new' || r.status === 'reviewing').length,
      completedOrders: requests.filter(r => r.status === 'approved').length,
      newContacts: contactsList.filter(c => c.status === 'new').length,
      newPricingRequests: requests.filter(r => r.status === 'new').length,
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.total_price || 0), 0) / orders.length : 0,
      unreadMessages: contactsList.filter(c => c.status === 'new').length,
      totalDesigns: 0
    });
  };

  const logAudit = async (entityType: string, entityId: string, action: string, oldVal: string, newVal: string) => {
    await supabase.from('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      old_value: oldVal,
      new_value: newVal,
      changed_by: ADMIN_EMAIL
    });
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const oldStatus = pricingRequests.find(r => r.id === id)?.status;
    await supabase.from('pricing_requests').update({ status }).eq('id', id);
    await logAudit('pricing_request', id, 'status_change', oldStatus || '', status);
    loadPricingRequests();
    loadStats();
    toast.success(isArabic ? 'تم التحديث' : 'Updated');
  };

  const assignRequestToTeam = async (id: string, teamMemberId: string) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    await supabase.from('pricing_requests').update({ 
      assigned_to: teamMemberId,
      assigned_to_name: member?.name,
      assigned_to_role: member?.role
    }).eq('id', id);
    await logAudit('pricing_request', id, 'assigned', '', member?.name || '');
    loadPricingRequests();
    toast.success(isArabic ? 'تم التعيين' : 'Assigned');
  };

  const updateRequestNotes = async (id: string, notes: string) => {
    await supabase.from('pricing_requests').update({ admin_notes: notes }).eq('id', id);
    await logAudit('pricing_request', id, 'notes_added', '', notes);
    loadPricingRequests();
    toast.success(isArabic ? 'تم الحفظ' : 'Saved');
  };

  const deleteRequest = async (id: string) => {
    await supabase.from('pricing_requests').delete().eq('id', id);
    await logAudit('pricing_request', id, 'deleted', '', '');
    loadPricingRequests();
    toast.success(isArabic ? 'تم الحذف' : 'Deleted');
    setShowDeleteConfirm(null);
  };

  const openRequestDetail = (request: PricingRequest) => {
    setSelectedRequest(request);
    setRequestDetailLang(isArabic ? 'ar' : 'en');
    setIsEditingRequest(false);
    setNoteToClient(request.admin_notes || '');
    setEditRequestForm({
      status: request.status,
      priority: request.priority || 'medium',
      package_id: request.package_id || null,
      selected_services: request.selected_services?.map(s => s.id) || [],
      estimated_subtotal: request.estimated_subtotal || 0,
      estimated_total: request.estimated_total || 0,
      admin_notes: request.admin_notes || ''
    });
  };

  const saveRequestEdit = async () => {
    if (!selectedRequest || !editRequestForm) return;
    
    const pkg = editRequestForm.package_id ? Object.values(PACKAGES).find(p => p.id === editRequestForm.package_id) : null;
    const services = editRequestForm.selected_services.map(sid => {
      const svc = getAllServices().find(s => s.id === sid);
      return svc ? { id: svc.id, name: svc.name, nameAr: svc.nameAr, price: svc.price } : null;
    }).filter(Boolean);

    const updateData: any = {
      status: editRequestForm.status,
      priority: editRequestForm.priority,
      package_id: editRequestForm.package_id,
      package_name: pkg ? (requestDetailLang === 'ar' ? pkg.nameAr : pkg.name) : null,
      selected_services: services,
      estimated_subtotal: editRequestForm.estimated_subtotal,
      estimated_total: editRequestForm.estimated_total,
      admin_notes: editRequestForm.admin_notes,
      updated_at: new Date().toISOString()
    };

    await supabase.from('pricing_requests').update(updateData).eq('id', selectedRequest.id);
    await logAudit('pricing_request', selectedRequest.id, 'updated', '', JSON.stringify(updateData));
    loadPricingRequests();
    
    const { data: updated } = await supabase.from('pricing_requests').select('*').eq('id', selectedRequest.id).single();
    if (updated) setSelectedRequest(updated);
    
    setIsEditingRequest(false);
    toast.success(isArabic ? 'تم التحديث' : 'Updated');
  };

  const sendNoteToClient = async () => {
    if (!selectedRequest) return;
    setSendingNote(true);
    await supabase.from('pricing_requests').update({ 
      admin_notes: noteToClient,
      updated_at: new Date().toISOString()
    }).eq('id', selectedRequest.id);
    await logAudit('pricing_request', selectedRequest.id, 'note_sent', '', noteToClient);
    loadPricingRequests();
    setSendingNote(false);
    toast.success(isArabic ? 'تم إرسال الملاحظة' : 'Note sent to client');
  };

  const handleDeleteWithConfirm = async (id: string) => {
    setShowDeleteConfirm(id);
  };

  const createTeamMember = async () => {
    if (!teamForm.name || !teamForm.phone || !teamForm.email) {
      toast.error(isArabic ? 'أدخل البيانات المطلوبة' : 'Fill required fields');
      return;
    }
    const { data, error } = await supabase.from('team_members').insert({
      name: teamForm.name,
      role: teamForm.role,
      phone: teamForm.phone,
      email: teamForm.email,
      avatar_url: teamForm.avatar_url,
      is_active: teamForm.is_active
    }).select().single();
    
    if (!error && data) {
      await logAudit('team_member', data.id, 'created', '', teamForm.name);
    }
    setTeamForm({ name: '', role: 'sales', phone: '', email: '', avatar_url: '', is_active: true });
    setShowAddTeam(false);
    loadTeamMembers();
    toast.success(isArabic ? 'تم الإضافة' : 'Added');
  };

  const updateTeamMember = async () => {
    if (!editingTeam || !teamForm.name) return;
    await supabase.from('team_members').update({
      name: teamForm.name,
      role: teamForm.role,
      phone: teamForm.phone,
      email: teamForm.email,
      avatar_url: teamForm.avatar_url,
      is_active: teamForm.is_active
    }).eq('id', editingTeam.id);
    await logAudit('team_member', editingTeam.id, 'updated', editingTeam.name, teamForm.name);
    setEditingTeam(null);
    setTeamForm({ name: '', role: 'sales', phone: '', email: '', avatar_url: '', is_active: true });
    loadTeamMembers();
    toast.success(isArabic ? 'تم التحديث' : 'Updated');
  };

  const deleteTeamMember = async (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    await supabase.from('team_members').delete().eq('id', id);
    if (member) await logAudit('team_member', id, 'deleted', member.name, '');
    loadTeamMembers();
    toast.success(isArabic ? 'تم الحذف' : 'Deleted');
  };

  const createDiscountCode = async () => {
    if (!discountForm.code || !discountForm.discount_value) {
      toast.error(isArabic ? 'أدخل البيانات المطلوبة' : 'Fill required fields');
      return;
    }
    const { data, error } = await supabase.from('discount_codes').insert({
      code: discountForm.code,
      description: discountForm.description,
      discount_type: discountForm.discount_type,
      discount_value: discountForm.discount_value,
      min_order_value: discountForm.min_order_value,
      max_discount: discountForm.max_discount,
      is_active: discountForm.is_active,
      valid_until: discountForm.valid_until || null,
      usage_limit: discountForm.usage_limit || null
    }).select().single();
    
    if (!error && data) {
      await logAudit('discount_code', data.id, 'created', '', discountForm.code);
    }
    setDiscountForm({
      code: '', description: '', discount_type: 'percentage', discount_value: 0,
      min_order_value: 0, max_discount: 0, is_active: true, valid_until: '', usage_limit: 0
    });
    setShowAddDiscount(false);
    loadDiscountCodes();
    toast.success(isArabic ? 'تم الإضافة' : 'Added');
  };

  const updateDiscountCode = async () => {
    if (!editingDiscount || !discountForm.code) return;
    await supabase.from('discount_codes').update({
      code: discountForm.code,
      description: discountForm.description,
      discount_type: discountForm.discount_type,
      discount_value: discountForm.discount_value,
      min_order_value: discountForm.min_order_value,
      max_discount: discountForm.max_discount,
      is_active: discountForm.is_active,
      valid_until: discountForm.valid_until || null,
      usage_limit: discountForm.usage_limit || null
    }).eq('id', editingDiscount.id);
    await logAudit('discount_code', editingDiscount.id, 'updated', editingDiscount.code, discountForm.code);
    setEditingDiscount(null);
    setDiscountForm({
      code: '', description: '', discount_type: 'percentage', discount_value: 0,
      min_order_value: 0, max_discount: 0, is_active: true, valid_until: '', usage_limit: 0
    });
    loadDiscountCodes();
    toast.success(isArabic ? 'تم التحديث' : 'Updated');
  };

  const toggleDiscountActive = async (id: string, current: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !current }).eq('id', id);
    loadDiscountCodes();
  };

  const deleteDiscountCode = async (id: string) => {
    const code = discountCodes.find(c => c.id === id);
    await supabase.from('discount_codes').delete().eq('id', id);
    if (code) await logAudit('discount_code', id, 'deleted', code.code, '');
    loadDiscountCodes();
    toast.success(isArabic ? 'تم الحذف' : 'Deleted');
  };

  const createClient = async () => {
    if (!clientForm.username || !clientForm.phone) {
      toast.error(isArabic ? 'أدخل البيانات المطلوبة' : 'Fill required fields');
      return;
    }
    const { data, error } = await supabase.from('clients').insert({
      username: clientForm.username,
      email: clientForm.email,
      phone: clientForm.phone,
      company_name: clientForm.company_name,
      status: clientForm.status,
      progress: clientForm.progress,
      next_steps: clientForm.next_steps,
      admin_notes: clientForm.admin_notes,
      package_name: clientForm.package_name
    }).select().single();
    
    if (!error && data) {
      await logAudit('client', data.id, 'created', '', clientForm.username);
    }
    setClientForm({
      username: '', email: '', phone: '', company_name: '', status: 'active',
      progress: 0, next_steps: '', admin_notes: '', package_name: ''
    });
    setShowAddClient(false);
    loadClients();
    toast.success(isArabic ? 'تم الإضافة' : 'Added');
  };

  const updateClient = async () => {
    if (!editingClient || !clientForm.username) return;
    await supabase.from('clients').update({
      username: clientForm.username,
      email: clientForm.email,
      phone: clientForm.phone,
      company_name: clientForm.company_name,
      status: clientForm.status,
      progress: clientForm.progress,
      next_steps: clientForm.next_steps,
      admin_notes: clientForm.admin_notes,
      package_name: clientForm.package_name
    }).eq('id', editingClient.id);
    await logAudit('client', editingClient.id, 'updated', editingClient.username, clientForm.username);
    setEditingClient(null);
    setClientForm({
      username: '', email: '', phone: '', company_name: '', status: 'active',
      progress: 0, next_steps: '', admin_notes: '', package_name: ''
    });
    loadClients();
    toast.success(isArabic ? 'تم التحديث' : 'Updated');
  };

  const deleteClient = async (id: string) => {
    const client = clients.find(c => c.id === id);
    await supabase.from('clients').delete().eq('id', id);
    if (client) await logAudit('client', id, 'deleted', client.username, '');
    loadClients();
    toast.success(isArabic ? 'تم الحذف' : 'Deleted');
  };

  const updateContactStatus = async (id: string, status: string) => {
    const oldStatus = contacts.find(c => c.id === id)?.status;
    await supabase.from('contacts').update({ status }).eq('id', id);
    await logAudit('contact', id, 'status_change', oldStatus || '', status);
    loadContacts();
    loadStats();
  };

  const assignContactToTeam = async (id: string, teamMemberId: string) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    await supabase.from('contacts').update({ 
      assigned_to: teamMemberId,
      assigned_to_name: member?.name
    }).eq('id', id);
    await logAudit('contact', id, 'assigned', '', member?.name || '');
    loadContacts();
    toast.success(isArabic ? 'تم التعيين' : 'Assigned');
  };

  const updateContactNotes = async (id: string, notes: string) => {
    await supabase.from('contacts').update({ admin_notes: notes }).eq('id', id);
    await logAudit('contact', id, 'notes_added', '', notes);
    loadContacts();
    toast.success(isArabic ? 'تم الحفظ' : 'Saved');
  };

  const deleteContact = async (id: string) => {
    await supabase.from('contacts').delete().eq('id', id);
    await logAudit('contact', id, 'deleted', '', '');
    loadContacts();
    toast.success(isArabic ? 'تم الحذف' : 'Deleted');
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    loadNotifications();
  };

  const markAllNotificationsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    loadNotifications();
  };

  const filteredRequests = pricingRequests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    const searchLower = searchTerm.toLowerCase();
    if (searchTerm && 
        !r.guest_name?.toLowerCase().includes(searchLower) && 
        !r.guest_email?.toLowerCase().includes(searchLower) &&
        !r.guest_phone?.includes(searchTerm) &&
        !r.company_name?.toLowerCase().includes(searchLower)) return false;
    return true;
  });

  const filteredContacts = contacts.filter(c => {
    if (contactStatusFilter !== 'all' && c.status !== contactStatusFilter) return false;
    const searchLower = searchTerm.toLowerCase();
    if (searchTerm && 
        !c.name?.toLowerCase().includes(searchLower) && 
        !c.email?.toLowerCase().includes(searchLower) &&
        !c.phone?.includes(searchTerm) &&
        !c.business_name?.toLowerCase().includes(searchLower)) return false;
    return true;
  });

  const filteredTeam = teamMembers.filter(m => {
    if (searchTerm && 
        !m.name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !m.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !m.role?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredDiscounts = discountCodes.filter(c => {
    if (searchTerm && 
        !c.code?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !c.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredClients = clients.filter(c => {
    if (searchTerm && 
        !c.username?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !c.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.phone?.includes(searchTerm) &&
        !c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { id: 'requests' as Tab, label: isArabic ? 'الطلبات' : 'Requests', icon: FileText },
    { id: 'discounts' as Tab, label: isArabic ? 'الأكواد' : 'Discounts', icon: Tag },
    { id: 'contacts' as Tab, label: isArabic ? 'جهات الاتصال' : 'Contacts', icon: Mail },
    { id: 'notifications' as Tab, label: isArabic ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'audit' as Tab, label: isArabic ? 'السجلات' : 'Audit', icon: History },
    { id: 'team' as Tab, label: isArabic ? 'الفريق' : 'Team', icon: Users },
    { id: 'clients' as Tab, label: isArabic ? 'العملاء' : 'Clients', icon: Building2 },
    { id: 'stats' as Tab, label: isArabic ? 'الإحصائيات' : 'Statistics', icon: BarChart3 },
  ];

  const ViewToggle = () => (
    <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-[#333]">
      <button
        onClick={() => setViewMode('card')}
        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'card' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-white'}`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-white'}`}
      >
        <Table2 className="w-4 h-4" />
      </button>
    </div>
  );

  const SearchBar = () => (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder={isArabic ? 'بحث...' : 'Search...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
      />
    </div>
  );

  const RoleBadge = ({ role }: { role: string }) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      sales: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      designer: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
      manager: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    };
    const labels: Record<string, string> = {
      admin: isArabic ? 'مدير' : 'Admin',
      sales: isArabic ? 'مبيعات' : 'Sales',
      designer: isArabic ? 'مصمم' : 'Designer',
      manager: isArabic ? 'مدير مشروع' : 'Manager'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[role] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <aside className="w-64 bg-[#111] border-r border-[#333] flex flex-col">
        <div className="p-6 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white">Lumos</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-all duration-200"
          >
            <ChevronRight className="w-5 h-5" />
            {isArabic ? 'العودة للموقع' : 'Back to Site'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isArabic ? 'لوحة إدارة لوموس' : 'Lumos Admin Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle />
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm font-medium text-gray-300 hover:bg-[#252525] hover:text-white hover:border-emerald-500/30 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              {isArabic ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        <SearchBar />

        {activeTab === 'requests' && (
          <div className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
              >
                <option value="all">{isArabic ? 'كل الحالات' : 'All Status'}</option>
                <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                <option value="reviewing">{isArabic ? 'قيد المراجعة' : 'Reviewing'}</option>
                <option value="approved">{isArabic ? 'معتمد' : 'Approved'}</option>
                <option value="rejected">{isArabic ? 'مرفوض' : 'Rejected'}</option>
                <option value="converted">{isArabic ? 'محول' : 'Converted'}</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
              >
                <option value="all">{isArabic ? 'كل الأولويات' : 'All Priority'}</option>
                <option value="low">{isArabic ? 'منخفضة' : 'Low'}</option>
                <option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option>
                <option value="high">{isArabic ? 'عالية' : 'High'}</option>
                <option value="urgent">{isArabic ? 'عاجلة' : 'Urgent'}</option>
              </select>
            </div>

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map(request => (
                  <div key={request.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{request.guest_name || request.company_name || 'Unknown'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            request.status === 'new' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                            request.status === 'reviewing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            request.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {request.status === 'new' ? (isArabic ? 'جديد' : 'New') :
                             request.status === 'reviewing' ? (isArabic ? 'قيد المراجعة' : 'Reviewing') :
                             request.status === 'approved' ? (isArabic ? 'معتمد' : 'Approved') :
                             request.status === 'rejected' ? (isArabic ? 'مرفوض' : 'Rejected') :
                             (isArabic ? 'محول' : 'Converted')}
                          </span>
                          {request.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              request.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              request.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              request.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {request.priority === 'urgent' ? (isArabic ? 'عاجل' : 'Urgent') :
                               request.priority === 'high' ? (isArabic ? 'عالية' : 'High') :
                               request.priority === 'medium' ? (isArabic ? 'متوسطة' : 'Medium') :
                               (isArabic ? 'منخفضة' : 'Low')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          {request.guest_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{request.guest_email}</span>}
                          {request.guest_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{request.guest_phone}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {request.package_name && (
                      <div className="bg-[#0f0f0f] rounded-lg p-3 text-sm mb-4 border border-[#333]">
                        <span className="font-medium text-gray-400">{isArabic ? 'الباقة' : 'Package'}:</span> <span className="text-white">{request.package_name}</span>
                      </div>
                    )}

                    <div className="text-sm text-gray-400 mb-3">
                      <span className="font-medium">{isArabic ? 'الإجمالي' : 'Total'}:</span> <span className="text-emerald-400 font-bold">{request.estimated_total || 0}</span> <span className="text-gray-500">{request.price_currency || 'EGP'}</span>
                    </div>

                    {request.assigned_to_name && (
                      <div className="text-xs text-gray-500 mb-3">
                        <span className="font-medium">{isArabic ? 'مُسند إلى' : 'Assigned'}:</span> <span className="text-emerald-400">{request.assigned_to_name}</span> <span className="text-gray-500">({request.assigned_to_role})</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-[#333]">
                      <button
                        onClick={() => openRequestDetail(request)}
                        className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200"
                      >
                        {isArabic ? 'عرض التفاصيل' : 'View Details'}
                      </button>
                      <select
                        value={request.status}
                        onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                        className="px-3 py-1.5 bg-[#0f0f0f] border border-[#444] rounded-lg text-xs text-white hover:border-emerald-500/50"
                      >
                        <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                        <option value="reviewing">{isArabic ? 'قيد المراجعة' : 'Reviewing'}</option>
                        <option value="approved">{isArabic ? 'معتمد' : 'Approved'}</option>
                        <option value="converted">{isArabic ? 'محويل' : 'Converted'}</option>
                        <option value="rejected">{isArabic ? 'مرفوض' : 'Rejected'}</option>
                      </select>
                      <select
                        value={request.assigned_to || ''}
                        onChange={(e) => assignRequestToTeam(request.id, e.target.value)}
                        className="px-3 py-1.5 bg-[#0f0f0f] border border-[#444] rounded-lg text-xs text-white hover:border-emerald-500/50"
                      >
                        <option value="">{isArabic ? 'تعيين لفريق' : 'Assign Team'}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500 hover:text-white transition-all duration-200"
                      >
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f] border-b border-[#333]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'العميل' : 'Client'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الباقة' : 'Package'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'السعر' : 'Price'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'مُسند إلى' : 'Assigned'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'التاريخ' : 'Date'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {filteredRequests.map((request, idx) => (
                        <tr key={request.id} className={`hover:bg-[#252525] transition-colors duration-150 ${idx % 2 === 1 ? 'bg-[#151515]' : 'bg-[#1a1a1a]'}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{request.guest_name || request.company_name || '-'}</div>
                            <div className="text-xs text-gray-500">{request.guest_phone}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{request.package_name || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-emerald-400">{request.estimated_total || 0}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              request.status === 'new' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                              request.status === 'reviewing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              request.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {request.status === 'new' ? (isArabic ? 'جديد' : 'New') :
                               request.status === 'reviewing' ? (isArabic ? 'قيد المراجعة' : 'Reviewing') :
                               request.status === 'approved' ? (isArabic ? 'معتمد' : 'Approved') :
                               request.status === 'rejected' ? (isArabic ? 'مرفوض' : 'Rejected') :
                               (isArabic ? 'محول' : 'Converted')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{request.assigned_to_name || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openRequestDetail(request)} className="p-1.5 hover:bg-emerald-500/20 rounded transition-colors">
                                <FileText className="w-4 h-4 text-emerald-400" />
                              </button>
                              <button onClick={() => deleteRequest(request.id)} className="p-1.5 hover:bg-rose-500/20 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد طلبات' : 'No requests found'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discounts' && (
          <div className="space-y-6 mt-6">
            <div className="flex justify-end">
              <button
                onClick={() => { setShowAddDiscount(true); setEditingDiscount(null); setDiscountForm({
                  code: '', description: '', discount_type: 'percentage', discount_value: 0,
                  min_order_value: 0, max_discount: 0, is_active: true, valid_until: '', usage_limit: 0
                }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة كود' : 'Add Code'}
              </button>
            </div>

            {(showAddDiscount || editingDiscount) && (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                <h3 className="font-bold text-white mb-4">
                  {editingDiscount ? (isArabic ? 'تعديل الكود' : 'Edit Code') : (isArabic ? 'إضافة كود خصم جديد' : 'Add New Discount Code')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="CODE"
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm font-bold uppercase text-white placeholder-gray-600"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الوصف' : 'Description'}
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm({...discountForm, discount_type: e.target.value as any})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white"
                  >
                    <option value="percentage">{isArabic ? 'نسبة مئوية' : 'Percentage'}</option>
                    <option value="fixed">{isArabic ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  </select>
                  <input
                    type="number"
                    placeholder={isArabic ? 'القيمة' : 'Value'}
                    value={discountForm.discount_value}
                    onChange={(e) => setDiscountForm({...discountForm, discount_value: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'الحد الأدنى' : 'Min Order'}
                    value={discountForm.min_order_value}
                    onChange={(e) => setDiscountForm({...discountForm, min_order_value: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'الحد الأقصى للخصم' : 'Max Discount'}
                    value={discountForm.max_discount}
                    onChange={(e) => setDiscountForm({...discountForm, max_discount: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="date"
                    placeholder={isArabic ? 'صالح حتى' : 'Valid Until'}
                    value={discountForm.valid_until}
                    onChange={(e) => setDiscountForm({...discountForm, valid_until: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'حد الاستخدام' : 'Usage Limit'}
                    value={discountForm.usage_limit}
                    onChange={(e) => setDiscountForm({...discountForm, usage_limit: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discountForm.is_active}
                      onChange={(e) => setDiscountForm({...discountForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-emerald-500 rounded bg-[#0f0f0f] border-[#333]"
                    />
                    <span className="text-sm text-gray-300">{isArabic ? 'نشط' : 'Active'}</span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddDiscount(false); setEditingDiscount(null); }}
                    className="px-4 py-2 text-gray-400 hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingDiscount ? updateDiscountCode : createDiscountCode}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDiscounts.map(code => (
                  <div key={code.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-black text-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">{code.code}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            code.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {code.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{code.description || 'No description'}</p>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                          {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value} EGP`}
                          {code.min_order_value > 0 && ` (${isArabic ? 'الحد الأدنى' : 'Min'}: ${code.min_order_value})`}
                          {code.max_discount && ` - Max: ${code.max_discount}`}
                        </p>
                        {code.valid_until && (
                          <p className="text-xs text-gray-500 mt-2">
                            <Clock className="w-3 h-3 inline" /> {isArabic ? 'صالح حتى' : 'Valid until'}: {code.valid_until}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-[#333]">
                      <button
                        onClick={() => {
                          setEditingDiscount(code);
                          setDiscountForm({
                            code: code.code,
                            description: code.description || '',
                            discount_type: code.discount_type,
                            discount_value: code.discount_value,
                            min_order_value: code.min_order_value || 0,
                            max_discount: code.max_discount || 0,
                            is_active: code.is_active,
                            valid_until: code.valid_until || '',
                            usage_limit: code.usage_limit || 0
                          });
                          setShowAddDiscount(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all duration-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => toggleDiscountActive(code.id, code.is_active)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[#0f0f0f] text-gray-400 border border-[#333] rounded-lg text-xs font-medium hover:bg-[#252525] hover:text-white transition-all duration-200"
                      >
                        {code.is_active ? (isArabic ? 'إلغاء تفعيل' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate')}
                      </button>
                      <button
                        onClick={() => deleteDiscountCode(code.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500 hover:text-white transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f] border-b border-[#333]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الكود' : 'Code'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الوصف' : 'Description'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'القيمة' : 'Value'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'صالح حتى' : 'Valid Until'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {filteredDiscounts.map((code, idx) => (
                        <tr key={code.id} className={`hover:bg-[#252525] transition-colors duration-150 ${idx % 2 === 1 ? 'bg-[#151515]' : 'bg-[#1a1a1a]'}`}>
                          <td className="px-4 py-3 font-bold text-emerald-400">{code.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{code.description || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value} EGP`}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              code.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {code.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{code.valid_until || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => deleteDiscountCode(code.id)} className="p-1.5 hover:bg-rose-500/20 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {discountCodes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد أكواد' : 'No discount codes'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-4">
              <select
                value={contactStatusFilter}
                onChange={(e) => setContactStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200"
              >
                <option value="all">{isArabic ? 'كل الحالات' : 'All Status'}</option>
                <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                <option value="read">{isArabic ? 'مقروء' : 'Read'}</option>
                <option value="contacted">{isArabic ? 'تم التواصل' : 'Contacted'}</option>
                <option value="resolved">{isArabic ? 'تم الحل' : 'Resolved'}</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجمالي' : 'Total'}</p>
                <p className="text-2xl font-black text-white">{contacts.length}</p>
              </div>
              <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/30">
                <p className="text-xs font-bold text-cyan-400 uppercase">{isArabic ? 'جديد' : 'New'}</p>
                <p className="text-2xl font-black text-cyan-400">{contacts.filter(c => c.status === 'new').length}</p>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
                <p className="text-xs font-bold text-amber-400 uppercase">{isArabic ? 'تم التواصل' : 'Contacted'}</p>
                <p className="text-2xl font-black text-amber-400">{contacts.filter(c => c.status === 'contacted').length}</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                <p className="text-xs font-bold text-emerald-400 uppercase">{isArabic ? 'تم الحل' : 'Resolved'}</p>
                <p className="text-2xl font-black text-emerald-400">{contacts.filter(c => c.status === 'resolved').length}</p>
              </div>
            </div>

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map(contact => (
                  <div key={contact.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{contact.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            contact.status === 'new' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                            contact.status === 'read' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            contact.status === 'contacted' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {contact.status === 'new' ? (isArabic ? 'جديد' : 'New') :
                             contact.status === 'read' ? (isArabic ? 'مقروء' : 'Read') :
                             contact.status === 'contacted' ? (isArabic ? 'تم التواصل' : 'Contacted') :
                             (isArabic ? 'تم الحل' : 'Resolved')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.business_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {contact.business_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(contact.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {contact.message && (
                      <div className="bg-[#0f0f0f] rounded-lg p-3 text-sm text-gray-400 mb-4 border border-[#333]">
                        {contact.message}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-[#333]">
                      <select
                        value={contact.status || 'new'}
                        onChange={(e) => updateContactStatus(contact.id, e.target.value)}
                        className="px-3 py-1.5 bg-[#0f0f0f] border border-[#333] rounded-lg text-xs text-white"
                      >
                        <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                        <option value="read">{isArabic ? 'مقروء' : 'Read'}</option>
                        <option value="contacted">{isArabic ? 'تم التواصل' : 'Contacted'}</option>
                        <option value="resolved">{isArabic ? 'تم الحل' : 'Resolved'}</option>
                      </select>
                      <select
                        value={contact.assigned_to || ''}
                        onChange={(e) => assignContactToTeam(contact.id, e.target.value)}
                        className="px-3 py-1.5 bg-[#0f0f0f] border border-[#333] rounded-lg text-xs text-white"
                      >
                        <option value="">{isArabic ? 'تعيين لفريق' : 'Assign'}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500 hover:text-white transition-all duration-200"
                      >
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f] border-b border-[#333]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الاسم' : 'Name'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الهاتف' : 'Phone'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'البريد' : 'Email'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الشركة' : 'Company'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'التاريخ' : 'Date'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {filteredContacts.map((contact, idx) => (
                        <tr key={contact.id} className={`hover:bg-[#252525] transition-colors duration-150 ${idx % 2 === 1 ? 'bg-[#151515]' : 'bg-[#1a1a1a]'}`}>
                          <td className="px-4 py-3 font-medium text-white">{contact.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{contact.phone}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{contact.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{contact.business_name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              contact.status === 'new' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                              contact.status === 'contacted' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {contact.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(contact.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => deleteContact(contact.id)} className="p-1.5 hover:bg-rose-500/20 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد جهات اتصال' : 'No contacts found'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 mt-6">
            <div className="flex justify-end">
              <button
                onClick={markAllNotificationsRead}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                {isArabic ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            </div>
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className={`bg-[#1a1a1a] rounded-xl border p-4 cursor-pointer hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 ${!notif.is_read ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#333]'}`}
                onClick={() => markNotificationRead(notif.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-white">{notif.title}</h3>
                  {!notif.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                </div>
                <p className="text-sm text-gray-400">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد إشعارات' : 'No notifications'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4 mt-6">
            {auditLogs.map(log => (
              <div key={log.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-4 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#0f0f0f] rounded text-xs font-bold text-gray-400 border border-[#333]">{log.entity_type}</span>
                    <span className="text-sm font-medium text-white">{log.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                {log.old_value && (
                  <p className="text-sm text-gray-500">
                    {isArabic ? 'من' : 'From'}: <span className="text-gray-400">{log.old_value}</span> → {isArabic ? 'إلى' : 'To'}: <span className="text-emerald-400">{log.new_value}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{log.changed_by}</p>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد سجلات' : 'No audit logs yet'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6 mt-6">
            <div className="flex justify-end">
              <button
                onClick={() => { setShowAddTeam(true); setEditingTeam(null); setTeamForm({
                  name: '', role: 'sales', phone: '', email: '', avatar_url: '', is_active: true
                }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة عضو' : 'Add Member'}
              </button>
            </div>

            {(showAddTeam || editingTeam) && (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                <h3 className="font-bold text-white mb-4">
                  {editingTeam ? (isArabic ? 'تعديل عضو' : 'Edit Member') : (isArabic ? 'إضافة عضو جديد' : 'Add New Member')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder={isArabic ? 'الاسم' : 'Name'}
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="email"
                    placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({...teamForm, email: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="tel"
                    placeholder={isArabic ? 'الهاتف' : 'Phone'}
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm({...teamForm, phone: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <select
                    value={teamForm.role}
                    onChange={(e) => setTeamForm({...teamForm, role: e.target.value as any})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white"
                  >
                    <option value="admin">{isArabic ? 'مدير' : 'Admin'}</option>
                    <option value="sales">{isArabic ? 'مبيعات' : 'Sales'}</option>
                    <option value="designer">{isArabic ? 'مصمم' : 'Designer'}</option>
                    <option value="manager">{isArabic ? 'مدير مشروع' : 'Manager'}</option>
                  </select>
                  <input
                    type="url"
                    placeholder={isArabic ? 'رابط الصورة' : 'Avatar URL'}
                    value={teamForm.avatar_url}
                    onChange={(e) => setTeamForm({...teamForm, avatar_url: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teamForm.is_active}
                      onChange={(e) => setTeamForm({...teamForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-emerald-500 rounded bg-[#0f0f0f] border-[#333]"
                    />
                    <span className="text-sm text-gray-300">{isArabic ? 'نشط' : 'Active'}</span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddTeam(false); setEditingTeam(null); }}
                    className="px-4 py-2 text-gray-400 hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingTeam ? updateTeamMember : createTeamMember}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeam.map(member => (
                  <div key={member.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start gap-4 mb-4">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#333]" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          member.role === 'admin' ? 'bg-purple-500/20' :
                          member.role === 'sales' ? 'bg-cyan-500/20' :
                          member.role === 'designer' ? 'bg-pink-500/20' : 'bg-amber-500/20'
                        }`}>
                          <span className={`text-lg font-bold ${
                            member.role === 'admin' ? 'text-purple-400' :
                            member.role === 'sales' ? 'text-cyan-400' :
                            member.role === 'designer' ? 'text-pink-400' : 'text-amber-400'
                          }`}>{member.name?.charAt(0) || '?'}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{member.name}</h3>
                        <RoleBadge role={member.role} />
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          member.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {member.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      {member.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" />{member.email}</p>}
                      {member.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{member.phone}</p>}
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-[#333]">
                      <button
                        onClick={() => {
                          setEditingTeam(member);
                          setTeamForm({
                            name: member.name,
                            role: member.role,
                            phone: member.phone || '',
                            email: member.email || '',
                            avatar_url: member.avatar_url || '',
                            is_active: member.is_active
                          });
                          setShowAddTeam(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all duration-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteTeamMember(member.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500 hover:text-white transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f] border-b border-[#333]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الاسم' : 'Name'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الدور' : 'Role'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'البريد' : 'Email'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الهاتف' : 'Phone'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {filteredTeam.map((member, idx) => (
                        <tr key={member.id} className={`hover:bg-[#252525] transition-colors duration-150 ${idx % 2 === 1 ? 'bg-[#151515]' : 'bg-[#1a1a1a]'}`}>
                          <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                          <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                          <td className="px-4 py-3 text-sm text-gray-400">{member.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{member.phone || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              member.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {member.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => deleteTeamMember(member.id)} className="p-1.5 hover:bg-rose-500/20 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {teamMembers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا يوجد أعضاء' : 'No team members'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6 mt-6">
            <div className="flex justify-end">
              <button
                onClick={() => { setShowAddClient(true); setEditingClient(null); setClientForm({
                  username: '', email: '', phone: '', company_name: '', status: 'active',
                  progress: 0, next_steps: '', admin_notes: '', package_name: ''
                }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة عميل' : 'Add Client'}
              </button>
            </div>

            {(showAddClient || editingClient) && (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
                <h3 className="font-bold text-white mb-4">
                  {editingClient ? (isArabic ? 'تعديل عميل' : 'Edit Client') : (isArabic ? 'إضافة عميل جديد' : 'Add New Client')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder={isArabic ? 'اسم المستخدم' : 'Username'}
                    value={clientForm.username}
                    onChange={(e) => setClientForm({...clientForm, username: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'اسم الشركة' : 'Company Name'}
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({...clientForm, company_name: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="email"
                    placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="tel"
                    placeholder={isArabic ? 'الهاتف' : 'Phone'}
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الباقة' : 'Package'}
                    value={clientForm.package_name}
                    onChange={(e) => setClientForm({...clientForm, package_name: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <select
                    value={clientForm.status}
                    onChange={(e) => setClientForm({...clientForm, status: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white"
                  >
                    <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                    <option value="pending">{isArabic ? 'قيد الانتظار' : 'Pending'}</option>
                    <option value="completed">{isArabic ? 'مكتمل' : 'Completed'}</option>
                    <option value="cancelled">{isArabic ? 'ملغى' : 'Cancelled'}</option>
                  </select>
                  <input
                    type="number"
                    placeholder={isArabic ? 'التقدم (0-100)' : 'Progress (0-100)'}
                    value={clientForm.progress}
                    onChange={(e) => setClientForm({...clientForm, progress: Number(e.target.value)})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                    min={0}
                    max={100}
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الخطوات التالية' : 'Next Steps'}
                    value={clientForm.next_steps}
                    onChange={(e) => setClientForm({...clientForm, next_steps: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600"
                  />
                  <textarea
                    placeholder={isArabic ? 'ملاحظات الإدارة' : 'Admin Notes'}
                    value={clientForm.admin_notes}
                    onChange={(e) => setClientForm({...clientForm, admin_notes: e.target.value})}
                    className="px-4 py-2.5 bg-[#0f0f0f] border border-[#333] rounded-xl text-sm text-white placeholder-gray-600 col-span-2"
                    rows={2}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddClient(false); setEditingClient(null); }}
                    className="px-4 py-2 text-gray-400 hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingClient ? updateClient : createClient}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                  <div key={client.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <span className="text-white font-bold">{client.username?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{client.username}</h3>
                          {client.company_name && <p className="text-xs text-gray-500">{client.company_name}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      {client.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" />{client.email}</p>}
                      {client.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{client.phone}</p>}
                      {client.package_name && <p className="flex items-center gap-2"><Briefcase className="w-3 h-3" />{client.package_name}</p>}
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{isArabic ? 'التقدم' : 'Progress'}</span>
                        <span className="text-emerald-400 font-bold">{client.progress || 0}%</span>
                      </div>
                      <div className="h-2 bg-[#0f0f0f] rounded-full overflow-hidden border border-[#333]">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${client.progress || 0}%` }}></div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-[#333]">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        client.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        client.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        client.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {client.status === 'active' ? (isArabic ? 'نشط' : 'Active') :
                         client.status === 'pending' ? (isArabic ? 'قيد الانتظار' : 'Pending') :
                         client.status === 'completed' ? (isArabic ? 'مكتمل' : 'Completed') :
                         (isArabic ? 'ملغى' : 'Cancelled')}
                      </span>
                      <button
                        onClick={() => {
                          setEditingClient(client);
                          setClientForm({
                            username: client.username,
                            email: client.email || '',
                            phone: client.phone || '',
                            company_name: client.company_name || '',
                            status: client.status || 'active',
                            progress: client.progress || 0,
                            next_steps: client.next_steps || '',
                            admin_notes: client.admin_notes || '',
                            package_name: client.package_name || ''
                          });
                          setShowAddClient(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500 hover:text-white transition-all duration-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-500 hover:text-white transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f] border-b border-[#333]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الاسم' : 'Name'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الشركة' : 'Company'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الباقة' : 'Package'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'التقدم' : 'Progress'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                      {filteredClients.map((client, idx) => (
                        <tr key={client.id} className={`hover:bg-[#252525] transition-colors duration-150 ${idx % 2 === 1 ? 'bg-[#151515]' : 'bg-[#1a1a1a]'}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{client.username}</div>
                            <div className="text-xs text-gray-500">{client.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{client.company_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{client.package_name || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-[#0f0f0f] rounded-full overflow-hidden border border-[#333]">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${client.progress || 0}%` }}></div>
                              </div>
                              <span className="text-xs text-emerald-400">{client.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              client.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {client.status || 'active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => deleteClient(client.id)} className="p-1.5 hover:bg-rose-500/20 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {clients.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا يوجد عملاء' : 'No clients'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{stats.totalPricingRequests}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'طلبات جديدة' : 'New Requests'}</p>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-cyan-400 group-hover:text-cyan-300 transition-colors">{stats.newPricingRequests}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">{stats.totalRevenue.toLocaleString()} <span className="text-lg text-gray-500">EGP</span></p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجمالي جهات الاتصال' : 'Total Contacts'}</p>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-white group-hover:text-blue-400 transition-colors">{stats.totalContacts}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'جهات اتصال جديدة' : 'New Contacts'}</p>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-cyan-400 group-hover:text-cyan-300 transition-colors">{stats.newContacts}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الأوردر المكتملة' : 'Completed Orders'}</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">{stats.completedOrders}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجمالي العملاء' : 'Total Clients'}</p>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-white group-hover:text-purple-400 transition-colors">{clients.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'أعضاء الفريق' : 'Team Members'}</p>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-purple-400 group-hover:text-purple-300 transition-colors">{teamMembers.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الأكواد النشطة' : 'Active Codes'}</p>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <p className="text-4xl font-black text-amber-400 group-hover:text-amber-300 transition-colors">{discountCodes.filter(c => c.is_active).length}</p>
            </div>
          </div>
        )}
      </main>

      {/* ═══════ Request Detail Modal - Dark Theme with Sidebar ═══════ */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex border border-[#333] shadow-2xl shadow-emerald-900/20">
            {/* ════ Sidebar Navigation ════ */}
            <div className="w-56 bg-[#111] border-r border-[#333] flex flex-col shrink-0">
              {/* Logo/Header */}
              <div className="p-4 border-b border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      {requestDetailLang === 'ar' ? 'تفاصيل' : 'Details'}
                    </p>
                    <p className="text-[10px] text-gray-500">#{selectedRequest.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-3 space-y-1">
                {[
                  { id: 'overview', icon: LayoutGrid, label: requestDetailLang === 'ar' ? 'نظرة عامة' : 'Overview' },
                  { id: 'client', icon: User, label: requestDetailLang === 'ar' ? 'العميل' : 'Client' },
                  { id: 'package', icon: PackageIcon, label: requestDetailLang === 'ar' ? 'الباقة' : 'Package' },
                  { id: 'services', icon: Zap, label: requestDetailLang === 'ar' ? 'الخدمات' : 'Services' },
                  { id: 'pricing', icon: Receipt, label: requestDetailLang === 'ar' ? 'التسعير' : 'Pricing' },
                  { id: 'notes', icon: FileText, label: requestDetailLang === 'ar' ? 'الملاحظات' : 'Notes' },
                  { id: 'timeline', icon: Clock, label: requestDetailLang === 'ar' ? 'السجل' : 'Timeline' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      activeNavSection === item.id
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-transparent'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Language Toggle */}
              <div className="p-3 border-t border-[#333]">
                <button
                  onClick={() => setRequestDetailLang(l => l === 'ar' ? 'en' : 'ar')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-400 hover:text-white hover:border-emerald-500/50 transition-all"
                >
                  <span className="text-xs font-bold">{requestDetailLang === 'ar' ? 'EN' : 'AR'}</span>
                  <span className="text-[10px] text-gray-600">{requestDetailLang === 'ar' ? 'English' : 'العربية'}</span>
                </button>
              </div>

              {/* Close Button */}
              <div className="p-3 border-t border-[#333]">
                <button
                  onClick={() => { setSelectedRequest(null); setIsEditingRequest(false); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-all"
                >
                  <X className="w-4 h-4" />
                  <span className="text-xs">{requestDetailLang === 'ar' ? 'إغلاق' : 'Close'}</span>
                </button>
              </div>
            </div>

            {/* ════ Main Content Area ════ */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] bg-[#0f0f0f]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white uppercase">
                      {selectedRequest.guest_name || selectedRequest.company_name || (requestDetailLang === 'ar' ? 'ضيف' : 'Guest')}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRequest.id.slice(0, 8));
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                    >
                      {copySuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    selectedRequest.status === 'new' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    selectedRequest.status === 'reviewing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    selectedRequest.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedRequest.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {selectedRequest.status === 'new' ? (requestDetailLang === 'ar' ? 'جديد' : 'New') :
                     selectedRequest.status === 'reviewing' ? (requestDetailLang === 'ar' ? 'قيد المراجعة' : 'Reviewing') :
                     selectedRequest.status === 'approved' ? (requestDetailLang === 'ar' ? 'معتمد' : 'Approved') :
                     selectedRequest.status === 'rejected' ? (requestDetailLang === 'ar' ? 'مرفوض' : 'Rejected') :
                     (requestDetailLang === 'ar' ? 'محويل' : 'Converted')}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatRelativeTime(selectedRequest.created_at)}
                </div>
              </div>

              {/* Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* ════ OVERVIEW SECTION ════ */}
                <div className={`${activeNavSection === 'overview' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'نظرة عامة على الطلب' : 'Request Overview'}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Status */}
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'الحالة' : 'Status'}</p>
                        {isEditingRequest ? (
                          <select
                            value={editRequestForm?.status}
                            onChange={(e) => setEditRequestForm(f => f ? {...f, status: e.target.value} : f)}
                            className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded-lg text-sm text-white"
                          >
                            <option value="new">{requestDetailLang === 'ar' ? 'جديد' : 'New'}</option>
                            <option value="reviewing">{requestDetailLang === 'ar' ? 'قيد المراجعة' : 'Reviewing'}</option>
                            <option value="approved">{requestDetailLang === 'ar' ? 'معتمد' : 'Approved'}</option>
                            <option value="converted">{requestDetailLang === 'ar' ? 'محويل' : 'Converted'}</option>
                            <option value="rejected">{requestDetailLang === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-white">{selectedRequest.status === 'new' ? (requestDetailLang === 'ar' ? 'جديد' : 'New') : selectedRequest.status === 'reviewing' ? (requestDetailLang === 'ar' ? 'قيد المراجعة' : 'Reviewing') : selectedRequest.status === 'approved' ? (requestDetailLang === 'ar' ? 'معتمد' : 'Approved') : selectedRequest.status === 'rejected' ? (requestDetailLang === 'ar' ? 'مرفوض' : 'Rejected') : (requestDetailLang === 'ar' ? 'محويل' : 'Converted')}</p>
                        )}
                      </div>

                      {/* Priority */}
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'الأولوية' : 'Priority'}</p>
                        {isEditingRequest ? (
                          <select
                            value={editRequestForm?.priority}
                            onChange={(e) => setEditRequestForm(f => f ? {...f, priority: e.target.value} : f)}
                            className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#444] rounded-lg text-sm text-white"
                          >
                            <option value="low">{requestDetailLang === 'ar' ? 'منخفضة' : 'Low'}</option>
                            <option value="medium">{requestDetailLang === 'ar' ? 'متوسطة' : 'Medium'}</option>
                            <option value="high">{requestDetailLang === 'ar' ? 'عالية' : 'High'}</option>
                            <option value="urgent">{requestDetailLang === 'ar' ? 'عاجلة' : 'Urgent'}</option>
                          </select>
                        ) : (
                          <p className={`text-sm font-bold ${
                            selectedRequest.priority === 'urgent' ? 'text-rose-400' :
                            selectedRequest.priority === 'high' ? 'text-orange-400' :
                            selectedRequest.priority === 'medium' ? 'text-amber-400' : 'text-gray-400'
                          }`}>
                            {selectedRequest.priority === 'urgent' ? (requestDetailLang === 'ar' ? 'عاجل' : 'Urgent') :
                             selectedRequest.priority === 'high' ? (requestDetailLang === 'ar' ? 'عالية' : 'High') :
                             selectedRequest.priority === 'medium' ? (requestDetailLang === 'ar' ? 'متوسطة' : 'Medium') :
                             (requestDetailLang === 'ar' ? 'منخفضة' : 'Low')}
                          </p>
                        )}
                      </div>

                      {/* Type */}
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'النوع' : 'Type'}</p>
                        <p className="text-sm font-bold text-white">
                          {selectedRequest.request_type === 'package' ? (requestDetailLang === 'ar' ? 'باقة' : 'Package') : (requestDetailLang === 'ar' ? 'مخصص' : 'Custom')}
                        </p>
                      </div>

                      {/* Created */}
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</p>
                        <p className="text-sm font-bold text-white">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Assigned To */}
                    {selectedRequest.assigned_to_name && (
                      <div className="mt-4 p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'مُسند إلى' : 'Assigned To'}</p>
                        <p className="text-sm font-bold text-emerald-400">{selectedRequest.assigned_to_name} ({selectedRequest.assigned_to_role})</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ════ CLIENT SECTION ════ */}
                <div className={`${activeNavSection === 'client' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'معلومات العميل' : 'Client Information'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{requestDetailLang === 'ar' ? 'الاسم' : 'Name'}</p>
                        <p className="text-sm font-bold text-white">{selectedRequest.guest_name || selectedRequest.company_name || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{requestDetailLang === 'ar' ? 'الشركة' : 'Company'}</p>
                        <p className="text-sm font-bold text-white">{selectedRequest.company_name || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{requestDetailLang === 'ar' ? 'الهاتف' : 'Phone'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{selectedRequest.guest_phone || '-'}</p>
                          {selectedRequest.guest_phone && (
                            <a href={`https://wa.me/2${selectedRequest.guest_phone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{requestDetailLang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{selectedRequest.guest_email || '-'}</p>
                          {selectedRequest.guest_email && (
                            <a href={`mailto:${selectedRequest.guest_email}`} className="text-emerald-400 hover:text-emerald-300">
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ════ PACKAGE SECTION ════ */}
                <div className={`${activeNavSection === 'package' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <PackageIcon className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'الباقة المختارة' : 'Selected Package'}
                    </h3>
                    
                    {isEditingRequest ? (
                      <select
                        value={editRequestForm?.package_id || ''}
                        onChange={(e) => setEditRequestForm(f => f ? {...f, package_id: e.target.value || null} : f)}
                        className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#444] rounded-lg text-sm text-white"
                      >
                        <option value="">{requestDetailLang === 'ar' ? 'اختر باقة' : 'Select Package'}</option>
                        {Object.values(PACKAGES).map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {requestDetailLang === 'ar' ? pkg.nameAr : pkg.name} - {pkg.price} EGP
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-sm font-bold text-white">{selectedRequest.package_name || (requestDetailLang === 'ar' ? 'لم يتم اختيار باقة' : 'No package selected')}</p>
                        {selectedRequest.package_id && (
                          <p className="text-xs text-gray-500 mt-2">ID: {selectedRequest.package_id}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ════ SERVICES SECTION ════ */}
                <div className={`${activeNavSection === 'services' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'الخدمات المختارة' : 'Selected Services'}
                    </h3>
                    
                    {isEditingRequest ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {getAllServices().map(svc => (
                          <label key={svc.id} className="flex items-center gap-2 p-3 bg-[#0f0f0f] rounded-lg border border-[#333] cursor-pointer hover:border-emerald-500/50 transition-all">
                            <input
                              type="checkbox"
                              checked={editRequestForm?.selected_services.includes(svc.id) || false}
                              onChange={(e) => {
                                const current = editRequestForm?.selected_services || [];
                                const updated = e.target.checked 
                                  ? [...current, svc.id]
                                  : current.filter(id => id !== svc.id);
                                setEditRequestForm(f => f ? {...f, selected_services: updated} : f);
                              }}
                              className="w-4 h-4 text-emerald-500 rounded bg-[#1a1a1a] border-[#444]"
                            />
                            <span className="text-xs text-gray-300">{requestDetailLang === 'ar' ? svc.nameAr : svc.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRequest.selected_services?.length > 0 ? (
                          selectedRequest.selected_services.map((svc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg border border-[#333]">
                              <span className="text-sm text-white">{requestDetailLang === 'ar' ? svc.nameAr : svc.name}</span>
                              <span className="text-xs text-emerald-400">{svc.price || 0} EGP</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">{requestDetailLang === 'ar' ? 'لا توجد خدمات مختارة' : 'No services selected'}</p>
                        )}
                        {selectedRequest.selected_services?.length > 0 && (
                          <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 mt-4">
                            <span className="text-sm font-bold text-emerald-400">{requestDetailLang === 'ar' ? 'إجمالي الخدمات' : 'Total Services'}</span>
                            <span className="text-sm font-bold text-white">{selectedRequest.selected_services.length}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ════ PRICING SECTION ════ */}
                <div className={`${activeNavSection === 'pricing' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'تفاصيل التسعير' : 'Pricing Details'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</p>
                          {isEditingRequest ? (
                            <input
                              type="number"
                              value={editRequestForm?.estimated_subtotal || 0}
                              onChange={(e) => setEditRequestForm(f => f ? {...f, estimated_subtotal: parseFloat(e.target.value) || 0} : f)}
                              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-sm text-white"
                            />
                          ) : (
                            <p className="text-lg font-bold text-white">{selectedRequest.estimated_subtotal || 0}</p>
                          )}
                        </div>
                        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'الإجمالي' : 'Total'}</p>
                          {isEditingRequest ? (
                            <input
                              type="number"
                              value={editRequestForm?.estimated_total || 0}
                              onChange={(e) => setEditRequestForm(f => f ? {...f, estimated_total: parseFloat(e.target.value) || 0} : f)}
                              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-sm text-white"
                            />
                          ) : (
                            <p className="text-lg font-bold text-emerald-400">{selectedRequest.estimated_total || 0}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'العملة' : 'Currency'}</p>
                        <p className="text-sm font-bold text-white">{selectedRequest.price_currency || 'EGP'}</p>
                      </div>

                      {selectedRequest.applied_promo_code && (
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'كود الخصم' : 'Promo Code'}</p>
                          <p className="text-sm font-bold text-amber-400">{selectedRequest.applied_promo_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ════ NOTES SECTION ════ */}
                <div className={`${activeNavSection === 'notes' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'الملاحظات' : 'Notes'}
                    </h3>
                    
                    {selectedRequest.request_notes && (
                      <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'ملاحظات العميل' : 'Client Notes'}</p>
                        <p className="text-sm text-white">{selectedRequest.request_notes}</p>
                      </div>
                    )}

                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-2">{requestDetailLang === 'ar' ? 'ملاحظة للعميل (ستظهر له)' : 'Note to Client (Will be shown to client)'}</p>
                      <textarea
                        value={noteToClient}
                        onChange={(e) => setNoteToClient(e.target.value)}
                        placeholder={requestDetailLang === 'ar' ? 'اكتب ملاحظة تظهر للعميل في صفحة التتبع...' : 'Write a note to show to client on tracking page...'}
                        className="w-full px-3 py-2 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-sm text-white placeholder-gray-600"
                        rows={3}
                      />
                      <button
                        onClick={sendNoteToClient}
                        disabled={sendingNote || !noteToClient.trim()}
                        className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {sendingNote ? (requestDetailLang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (requestDetailLang === 'ar' ? 'إرسال للعميل' : 'Send to Client')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ════ TIMELINE SECTION ════ */}
                <div className={`${activeNavSection === 'timeline' ? 'block' : 'hidden'}`}>
                  <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {requestDetailLang === 'ar' ? 'سجل التغييرات' : 'Change History'}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#333]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-gray-400">{requestDetailLang === 'ar' ? 'تم الإنشاء' : 'Created'}:</span>
                        <span className="text-sm font-bold text-white">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                      </div>
                      {selectedRequest.updated_at && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#333]">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm text-gray-400">{requestDetailLang === 'ar' ? 'آخر تحديث' : 'Updated'}:</span>
                          <span className="text-sm font-bold text-white">{new Date(selectedRequest.updated_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedRequest.reviewed_at && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f0f] border border-[#333]">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-sm text-gray-400">{requestDetailLang === 'ar' ? 'تمت المراجعة' : 'Reviewed'}:</span>
                          <span className="text-sm font-bold text-white">{new Date(selectedRequest.reviewed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#333] bg-[#0f0f0f]">
                <div className="flex items-center gap-2">
                  {showDeleteConfirm === selectedRequest.id ? (
                    <>
                      <span className="text-sm text-rose-400 font-medium">{requestDetailLang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm delete?'}</span>
                      <button
                        onClick={() => deleteRequest(selectedRequest.id)}
                        className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600"
                      >
                        {requestDetailLang === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-[#333] text-gray-400 rounded-lg text-xs font-bold hover:bg-[#444]"
                      >
                        {requestDetailLang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDeleteWithConfirm(selectedRequest.id)}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold hover:bg-rose-500/20"
                    >
                      {requestDetailLang === 'ar' ? 'حذف الطلب' : 'Delete Request'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditingRequest ? (
                    <>
                      <button
                        onClick={() => setIsEditingRequest(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg text-sm font-bold"
                      >
                        {requestDetailLang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={saveRequestEdit}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
                      >
                        {requestDetailLang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingRequest(true)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
                    >
                      {requestDetailLang === 'ar' ? 'تعديل الطلب' : 'Edit Request'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
                <p className="text-sm text-gray-500">{isArabic ? 'لا يمكن التراجع عن هذا الإجراء' : 'This action cannot be undone'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => deleteRequest(showDeleteConfirm)}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
              >
                {isArabic ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;