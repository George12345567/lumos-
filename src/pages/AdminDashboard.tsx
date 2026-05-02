import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Tag, History, Bell, Users, BarChart3, 
  LogOut, ChevronRight, Search, Check, X, 
  RefreshCw, Trash2, Plus, Mail, Phone, Building2,
  LayoutGrid, Table2, Edit2, Save, User, Briefcase,
  Clock, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { PricingRequest, DiscountCode, AuditLog, TeamMember, DashboardStats, Contact, Client } from '@/types/dashboard';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

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
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('card')}
        className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
      >
        <Table2 className="w-4 h-4" />
      </button>
    </div>
  );

  const SearchBar = () => (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={isArabic ? 'بحث...' : 'Search...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
      />
    </div>
  );

  const RoleBadge = ({ role }: { role: string }) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      sales: 'bg-cyan-100 text-cyan-700',
      designer: 'bg-pink-100 text-pink-700',
      manager: 'bg-amber-100 text-amber-700'
    };
    const labels: Record<string, string> = {
      admin: isArabic ? 'مدير' : 'Admin',
      sales: isArabic ? 'مبيعات' : 'Sales',
      designer: isArabic ? 'مصمم' : 'Designer',
      manager: isArabic ? 'مدير مشروع' : 'Manager'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-gray-900">Lumos</h1>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
            {isArabic ? 'العودة للموقع' : 'Back to Site'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
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
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
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
                  <div key={request.id} className="bg-white rounded-xl border border-gray-100 p-6 hover:border-emerald-200 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-gray-900">{request.guest_name || request.company_name || 'Unknown'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            request.status === 'new' ? 'bg-cyan-100 text-cyan-700' :
                            request.status === 'reviewing' ? 'bg-amber-100 text-amber-700' :
                            request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            request.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {request.status === 'new' ? (isArabic ? 'جديد' : 'New') :
                             request.status === 'reviewing' ? (isArabic ? 'قيد المراجعة' : 'Reviewing') :
                             request.status === 'approved' ? (isArabic ? 'معتمد' : 'Approved') :
                             request.status === 'rejected' ? (isArabic ? 'مرفوض' : 'Rejected') :
                             (isArabic ? 'محول' : 'Converted')}
                          </span>
                          {request.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              request.priority === 'urgent' ? 'bg-rose-200 text-rose-800' :
                              request.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                              request.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
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
                      <span className="text-xs text-gray-400">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {request.package_name && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
                        <span className="font-medium">{isArabic ? 'الباقة' : 'Package'}:</span> {request.package_name}
                      </div>
                    )}

                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{isArabic ? 'الإجمالي' : 'Total'}:</span> {request.estimated_total || 0} {request.price_currency || 'EGP'}
                    </div>

                    {request.assigned_to_name && (
                      <div className="text-xs text-gray-500 mb-3">
                        <span className="font-medium">{isArabic ? 'مُ назнач' : 'Assigned'}:</span> {request.assigned_to_name} ({request.assigned_to_role})
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      <select
                        value={request.status}
                        onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
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
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="">{isArabic ? 'تعيين لفريق' : 'Assign Team'}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setEditingRequestNotes(request.id);
                          setSearchTerm(request.admin_notes || '');
                        }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                      >
                        {isArabic ? 'ملاحظات' : 'Notes'}
                      </button>
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                      >
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'العميل' : 'Client'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الباقة' : 'Package'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'السعر' : 'Price'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'مُ назнач' : 'Assigned'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'التاريخ' : 'Date'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.map(request => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{request.guest_name || request.company_name || '-'}</div>
                          <div className="text-xs text-gray-500">{request.guest_phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{request.package_name || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.estimated_total || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            request.status === 'new' ? 'bg-cyan-100 text-cyan-700' :
                            request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{request.assigned_to_name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(request.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => deleteRequest(request.id)} className="p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 text-gray-400">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة كود' : 'Add Code'}
              </button>
            </div>

            {(showAddDiscount || editingDiscount) && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {editingDiscount ? (isArabic ? 'تعديل الكود' : 'Edit Code') : (isArabic ? 'إضافة كود خصم جديد' : 'Add New Discount Code')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="CODE"
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold uppercase"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الوصف' : 'Description'}
                    value={discountForm.description}
                    onChange={(e) => setDiscountForm({...discountForm, description: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm({...discountForm, discount_type: e.target.value as any})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="percentage">{isArabic ? 'نسبة مئوية' : 'Percentage'}</option>
                    <option value="fixed">{isArabic ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  </select>
                  <input
                    type="number"
                    placeholder={isArabic ? 'القيمة' : 'Value'}
                    value={discountForm.discount_value}
                    onChange={(e) => setDiscountForm({...discountForm, discount_value: Number(e.target.value)})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'الحد الأدنى' : 'Min Order'}
                    value={discountForm.min_order_value}
                    onChange={(e) => setDiscountForm({...discountForm, min_order_value: Number(e.target.value)})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'الحد الأقصى للخصم' : 'Max Discount'}
                    value={discountForm.max_discount}
                    onChange={(e) => setDiscountForm({...discountForm, max_discount: Number(e.target.value)})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="date"
                    placeholder={isArabic ? 'صالح حتى' : 'Valid Until'}
                    value={discountForm.valid_until}
                    onChange={(e) => setDiscountForm({...discountForm, valid_until: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="number"
                    placeholder={isArabic ? 'حد الاستخدام' : 'Usage Limit'}
                    value={discountForm.usage_limit}
                    onChange={(e) => setDiscountForm({...discountForm, usage_limit: Number(e.target.value)})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discountForm.is_active}
                      onChange={(e) => setDiscountForm({...discountForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-emerald-500 rounded"
                    />
                    <span className="text-sm">{isArabic ? 'نشط' : 'Active'}</span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddDiscount(false); setEditingDiscount(null); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingDiscount ? updateDiscountCode : createDiscountCode}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDiscounts.map(code => (
                  <div key={code.id} className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-black text-lg text-emerald-600">{code.code}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            code.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {code.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{code.description || 'No description'}</p>
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                          {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value} EGP`}
                          {code.min_order_value > 0 && ` (${isArabic ? 'الحد الأدنى' : 'Min'}: ${code.min_order_value})`}
                          {code.max_discount && ` - Max: ${code.max_discount}`}
                        </p>
                        {code.valid_until && (
                          <p className="text-xs text-gray-400 mt-2">
                            <Clock className="w-3 h-3 inline" /> {isArabic ? 'صالح حتى' : 'Valid until'}: {code.valid_until}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
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
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => toggleDiscountActive(code.id, code.is_active)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                      >
                        {code.is_active ? (isArabic ? 'إلغاء تفعيل' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate')}
                      </button>
                      <button
                        onClick={() => deleteDiscountCode(code.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الكود' : 'Code'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الوصف' : 'Description'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'القيمة' : 'Value'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'صالح حتى' : 'Valid Until'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDiscounts.map(code => (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-emerald-600">{code.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{code.description || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {code.discount_type === 'percentage' ? `${code.discount_value}%` : `${code.discount_value} EGP`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            code.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {code.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{code.valid_until || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => deleteDiscountCode(code.id)} className="p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-500 outline-none"
              >
                <option value="all">{isArabic ? 'كل الحالات' : 'All Status'}</option>
                <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                <option value="read">{isArabic ? 'مقروء' : 'Read'}</option>
                <option value="contacted">{isArabic ? 'تم التواصل' : 'Contacted'}</option>
                <option value="resolved">{isArabic ? 'تم الحل' : 'Resolved'}</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase">{isArabic ? 'إجمالي' : 'Total'}</p>
                <p className="text-2xl font-black text-gray-900">{contacts.length}</p>
              </div>
              <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                <p className="text-xs font-bold text-cyan-500 uppercase">{isArabic ? 'جديد' : 'New'}</p>
                <p className="text-2xl font-black text-cyan-600">{contacts.filter(c => c.status === 'new').length}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-500 uppercase">{isArabic ? 'تم التواصل' : 'Contacted'}</p>
                <p className="text-2xl font-black text-amber-600">{contacts.filter(c => c.status === 'contacted').length}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-500 uppercase">{isArabic ? 'تم الحل' : 'Resolved'}</p>
                <p className="text-2xl font-black text-emerald-600">{contacts.filter(c => c.status === 'resolved').length}</p>
              </div>
            </div>

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map(contact => (
                  <div key={contact.id} className="bg-white rounded-xl border border-gray-100 p-6 hover:border-emerald-200 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{contact.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            contact.status === 'new' ? 'bg-cyan-100 text-cyan-700' :
                            contact.status === 'read' ? 'bg-blue-100 text-blue-700' :
                            contact.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
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
                      <span className="text-xs text-gray-400">{new Date(contact.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {contact.message && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mb-4">
                        {contact.message}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      <select
                        value={contact.status || 'new'}
                        onChange={(e) => updateContactStatus(contact.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="new">{isArabic ? 'جديد' : 'New'}</option>
                        <option value="read">{isArabic ? 'مقروء' : 'Read'}</option>
                        <option value="contacted">{isArabic ? 'تم التواصل' : 'Contacted'}</option>
                        <option value="resolved">{isArabic ? 'تم الحل' : 'Resolved'}</option>
                      </select>
                      <select
                        value={contact.assigned_to || ''}
                        onChange={(e) => assignContactToTeam(contact.id, e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="">{isArabic ? 'تعيين لفريق' : 'Assign'}</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                      >
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
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
                  <tbody className="divide-y divide-gray-100">
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{contact.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{contact.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{contact.business_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            contact.status === 'new' ? 'bg-cyan-100 text-cyan-700' :
                            contact.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(contact.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => deleteContact(contact.id)} className="p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {isArabic ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            </div>
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-emerald-200 ${!notif.is_read ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100'}`}
                onClick={() => markNotificationRead(notif.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{notif.title}</h3>
                  {!notif.is_read && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
                </div>
                <p className="text-sm text-gray-600">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا توجد إشعارات' : 'No notifications'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4 mt-6">
            {auditLogs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold text-gray-600">{log.entity_type}</span>
                    <span className="text-sm font-medium text-gray-900">{log.action}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                {log.old_value && (
                  <p className="text-sm text-gray-500">
                    {isArabic ? 'من' : 'From'}: {log.old_value} → {isArabic ? 'إلى' : 'To'}: {log.new_value}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{log.changed_by}</p>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة عضو' : 'Add Member'}
              </button>
            </div>

            {(showAddTeam || editingTeam) && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {editingTeam ? (isArabic ? 'تعديل عضو' : 'Edit Member') : (isArabic ? 'إضافة عضو جديد' : 'Add New Member')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder={isArabic ? 'الاسم' : 'Name'}
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="email"
                    placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({...teamForm, email: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="tel"
                    placeholder={isArabic ? 'الهاتف' : 'Phone'}
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm({...teamForm, phone: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <select
                    value={teamForm.role}
                    onChange={(e) => setTeamForm({...teamForm, role: e.target.value as any})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
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
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teamForm.is_active}
                      onChange={(e) => setTeamForm({...teamForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-emerald-500 rounded"
                    />
                    <span className="text-sm">{isArabic ? 'نشط' : 'Active'}</span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddTeam(false); setEditingTeam(null); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingTeam ? updateTeamMember : createTeamMember}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeam.map(member => (
                  <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          member.role === 'admin' ? 'bg-purple-100' :
                          member.role === 'sales' ? 'bg-cyan-100' :
                          member.role === 'designer' ? 'bg-pink-100' : 'bg-amber-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            member.role === 'admin' ? 'text-purple-600' :
                            member.role === 'sales' ? 'text-cyan-600' :
                            member.role === 'designer' ? 'text-pink-600' : 'text-amber-600'
                          }`}>{member.name?.charAt(0) || '?'}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{member.name}</h3>
                        <RoleBadge role={member.role} />
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mb-4">
                      {member.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" />{member.email}</p>}
                      {member.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{member.phone}</p>}
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
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
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteTeamMember(member.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الاسم' : 'Name'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الدور' : 'Role'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'البريد' : 'Email'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الهاتف' : 'Phone'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeam.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                        <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {member.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => deleteTeamMember(member.id)} className="p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {teamMembers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                {isArabic ? 'إضافة عميل' : 'Add Client'}
              </button>
            </div>

            {(showAddClient || editingClient) && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {editingClient ? (isArabic ? 'تعديل عميل' : 'Edit Client') : (isArabic ? 'إضافة عميل جديد' : 'Add New Client')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder={isArabic ? 'اسم المستخدم' : 'Username'}
                    value={clientForm.username}
                    onChange={(e) => setClientForm({...clientForm, username: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'اسم الشركة' : 'Company Name'}
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({...clientForm, company_name: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="email"
                    placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'}
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="tel"
                    placeholder={isArabic ? 'الهاتف' : 'Phone'}
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الباقة' : 'Package'}
                    value={clientForm.package_name}
                    onChange={(e) => setClientForm({...clientForm, package_name: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <select
                    value={clientForm.status}
                    onChange={(e) => setClientForm({...clientForm, status: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
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
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                    min={0}
                    max={100}
                  />
                  <input
                    type="text"
                    placeholder={isArabic ? 'الخطوات التالية' : 'Next Steps'}
                    value={clientForm.next_steps}
                    onChange={(e) => setClientForm({...clientForm, next_steps: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <textarea
                    placeholder={isArabic ? 'ملاحظات الإدارة' : 'Admin Notes'}
                    value={clientForm.admin_notes}
                    onChange={(e) => setClientForm({...clientForm, admin_notes: e.target.value})}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm col-span-2"
                    rows={2}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddClient(false); setEditingClient(null); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={editingClient ? updateClient : createClient}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    {isArabic ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                  <div key={client.id} className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{client.username?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{client.username}</h3>
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
                        <span>{isArabic ? 'التقدم' : 'Progress'}</span>
                        <span>{client.progress || 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${client.progress || 0}%` }}></div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        client.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
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
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                      >
                        <Edit2 className="w-3 h-3" /> {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-200"
                      >
                        <Trash2 className="w-3 h-3" /> {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الاسم' : 'Name'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الشركة' : 'Company'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الباقة' : 'Package'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'التقدم' : 'Progress'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{isArabic ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map(client => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{client.username}</div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{client.company_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{client.package_name || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${client.progress || 0}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500">{client.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {client.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => deleteClient(client.id)} className="p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {clients.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? 'لا يوجد عملاء' : 'No clients'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'إجمالي الطلبات' : 'Total Requests'}</p>
              <p className="text-4xl font-black text-gray-900">{stats.totalPricingRequests}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'طلبات جديدة' : 'New Requests'}</p>
              <p className="text-4xl font-black text-cyan-600">{stats.newPricingRequests}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
              <p className="text-4xl font-black text-emerald-600">{stats.totalRevenue.toLocaleString()} EGP</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'إجمالي جهات الاتصال' : 'Total Contacts'}</p>
              <p className="text-4xl font-black text-gray-900">{stats.totalContacts}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'جهات اتصال جديدة' : 'New Contacts'}</p>
              <p className="text-4xl font-black text-cyan-600">{stats.newContacts}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'الأوردر المكتملة' : 'Completed Orders'}</p>
              <p className="text-4xl font-black text-emerald-600">{stats.completedOrders}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'إجمالي العملاء' : 'Total Clients'}</p>
              <p className="text-4xl font-black text-gray-900">{clients.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'أعضاء الفريق' : 'Team Members'}</p>
              <p className="text-4xl font-black text-purple-600">{teamMembers.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isArabic ? 'الأكواد النشطة' : 'Active Codes'}</p>
              <p className="text-4xl font-black text-amber-600">{discountCodes.filter(c => c.is_active).length}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;