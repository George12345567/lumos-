import { memo, useMemo, useState } from 'react';
import { PricingRequest } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, FileText, RefreshCw, Trash2, XCircle, ArrowRightLeft, Search, Clock, MessageSquare, Eye, User, Flag, DollarSign, Calendar, Phone, Mail, Building, Package, X, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { adminText } from '@/data/adminI18n';

interface PricingRequestsManagerProps {
    requests: PricingRequest[];
    onUpdateStatus: (request: PricingRequest, status: PricingRequest['status']) => void;
    onUpdatePriority?: (request: PricingRequest, priority: PricingRequest['priority']) => void;
    onUpdateAssign?: (request: PricingRequest, assignedTo: string | null) => void;
    onDelete: (id: string) => void;
    onConvert: (request: PricingRequest) => void;
    onSaveAdminNotes?: (request: PricingRequest, adminNotes: string) => Promise<void> | void;
    onOpenClient?: (request: PricingRequest) => void;
}

type RequestFilter = 'all' | PricingRequest['status'];
type Priority = 'low' | 'medium' | 'high' | 'urgent';

const statusConfig: Record<PricingRequest['status'], { 
    labelAr: string;
    labelEn: string;
    gradient: string; 
    bg: string;
    border: string;
    iconBg: string;
    text: string;
    ring: string;
}> = {
    new: { 
        labelAr: 'جديد',
        labelEn: 'New', 
        gradient: 'from-cyan-400 to-cyan-500',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        text: 'text-cyan-400',
        ring: 'ring-cyan-500/30'
    },
    reviewing: { 
        labelAr: 'قيد المراجعة',
        labelEn: 'Reviewing', 
        gradient: 'from-amber-400 to-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        iconBg: 'bg-amber-500/20 text-amber-400',
        text: 'text-amber-400',
        ring: 'ring-amber-500/30'
    },
    approved: { 
        labelAr: 'معتمد',
        labelEn: 'Approved', 
        gradient: 'from-emerald-400 to-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        text: 'text-emerald-400',
        ring: 'ring-emerald-500/30'
    },
    converted: { 
        labelAr: 'محوّل',
        labelEn: 'Converted', 
        gradient: 'from-violet-400 to-violet-500',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/30',
        iconBg: 'bg-violet-500/20 text-violet-400',
        text: 'text-violet-400',
        ring: 'ring-violet-500/30'
    },
    rejected: { 
        labelAr: 'مرفوض',
        labelEn: 'Rejected', 
        gradient: 'from-rose-400 to-rose-500',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        iconBg: 'bg-rose-500/20 text-rose-400',
        text: 'text-rose-400',
        ring: 'ring-rose-500/30'
    },
    cancelled: {
        labelAr: 'ملغي',
        labelEn: 'Cancelled',
        gradient: 'from-slate-400 to-slate-500',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        iconBg: 'bg-slate-500/20 text-slate-400',
        text: 'text-slate-400',
        ring: 'ring-slate-500/30'
    },
};

const priorityConfig: Record<Priority, { labelAr: string; labelEn: string; color: string; bg: string }> = {
    low: { labelAr: 'منخفضة', labelEn: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    medium: { labelAr: 'متوسطة', labelEn: 'Medium', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    high: { labelAr: 'عالية', labelEn: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    urgent: { labelAr: 'عاجلة', labelEn: 'Urgent', color: 'text-rose-400', bg: 'bg-rose-500/20' },
};

const mockTeamMembers = [
    { id: '1', name: 'Ahmed', role: 'Sales' },
    { id: '2', name: 'Sara', role: 'Support' },
    { id: '3', name: 'Mohamed', role: 'Developer' },
];

export const PricingRequestsManager = memo(({ requests, onUpdateStatus, onUpdatePriority, onUpdateAssign, onDelete, onConvert, onSaveAdminNotes, onOpenClient }: PricingRequestsManagerProps) => {
    const { isArabic } = useLanguage();
    const tx = (key: Parameters<typeof adminText>[0]) => adminText(key, isArabic);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<RequestFilter>('all');
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<PricingRequest | null>(null);
    const [localNotes, setLocalNotes] = useState('');
    const [localPriority, setLocalPriority] = useState<Priority>('medium');
    const [localAssign, setLocalAssign] = useState<string | null>(null);

    const statusCounts = useMemo(() => ({
        new: requests.filter(r => r.status === 'new').length,
        reviewing: requests.filter(r => r.status === 'reviewing').length,
        approved: requests.filter(r => r.status === 'approved').length,
        converted: requests.filter(r => r.status === 'converted').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length,
    }), [requests]);

    const pipelineStats = useMemo(() => {
        const totalValue = requests.reduce((sum, r) => sum + (r.estimated_total || 0), 0);
        const customCount = requests.filter(r => r.request_type === 'custom').length;
        const packageCount = requests.filter(r => r.request_type === 'package').length;
        return { totalValue, customCount, packageCount };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const requester = request.company_name
                || request.guest_name
                || (typeof request.client_snapshot?.display_name === 'string' ? request.client_snapshot.display_name : null)
                || (typeof request.client_snapshot?.username === 'string' ? request.client_snapshot.username : null)
                || '';
            const haystack = [requester, request.package_name || '', request.guest_phone || '', request.guest_email || ''].join(' ').toLowerCase();
            const matchesSearch = haystack.includes(search.toLowerCase());
            const matchesFilter = filter === 'all' ? true : request.status === filter;
            return matchesSearch && matchesFilter;
        });
    }, [filter, requests, search]);

    const openDetailModal = (request: PricingRequest) => {
        setSelectedRequest(request);
        setLocalNotes(request.admin_notes || '');
        setLocalPriority(request.priority || 'medium');
        setLocalAssign(request.assigned_to);
    };

    const saveModalChanges = () => {
        if (!selectedRequest) return;
        if (onSaveAdminNotes) onSaveAdminNotes(selectedRequest, localNotes);
        if (onUpdatePriority && localPriority !== selectedRequest.priority) onUpdatePriority(selectedRequest, localPriority);
        if (onUpdateAssign && localAssign !== selectedRequest.assigned_to) onUpdateAssign(selectedRequest, localAssign);
        setSelectedRequest(null);
    };

    const saveNotes = async (request: PricingRequest) => {
        if (!onSaveAdminNotes) return;
        setSavingNotesId(request.id);
        try {
            await onSaveAdminNotes(request, notesDraft[request.id] ?? request.admin_notes ?? '');
        } finally {
            setSavingNotesId(null);
        }
    };

    const getRequesterName = (request: PricingRequest) => {
        return request.company_name
            || request.guest_name
            || (typeof request.client_snapshot?.display_name === 'string' ? request.client_snapshot.display_name : null)
            || (typeof request.client_snapshot?.username === 'string' ? request.client_snapshot.username : null)
            || (isArabic ? 'ضيف' : 'Guest');
    };

    const getPhone = (request: PricingRequest) => {
        return request.guest_phone || (typeof request.client_snapshot?.phone === 'string' ? request.client_snapshot.phone : null) || null;
    };

    const getEmail = (request: PricingRequest) => {
        return request.guest_email || (typeof request.client_snapshot?.email === 'string' ? request.client_snapshot.email : null) || null;
    };

    const getServiceSummary = (request: PricingRequest) => {
        return request.request_type === 'package'
            ? (request.package_name || (isArabic ? 'باقة جاهزة' : 'Ready Package'))
            : `${request.selected_services.length} ${isArabic ? 'خدمة' : 'services'}`;
    };

    const getStatusLabel = (status: PricingRequest['status']) => {
        return isArabic ? statusConfig[status].labelAr : statusConfig[status].labelEn;
    };

    const getPriorityLabel = (priority: Priority) => {
        return isArabic ? priorityConfig[priority].labelAr : priorityConfig[priority].labelEn;
    };

    return (
        <div className="flex gap-4">
            <div className="flex-1 min-w-0">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {isArabic ? 'طلبات التسعير' : 'Pricing Requests'}
                        </h3>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                            {statusCounts.new} {isArabic ? 'جديد' : 'New'}
                        </Badge>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-[#333] bg-[#0f0f0f] p-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isArabic ? 'البحث...' : 'Search...'}
                                className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${filter === 'all' ? 'bg-emerald-500 text-white' : 'border border-[#333] bg-[#1a1a1a] text-gray-400 hover:border-emerald-500/50'}`}
                        >
                            {isArabic ? 'الكل' : 'All'} ({requests.length})
                        </button>
                        {(Object.keys(statusConfig) as PricingRequest['status'][]).map((status) => {
                            const config = statusConfig[status];
                            const count = statusCounts[status];
                            return (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${filter === status ? `bg-gradient-to-r ${config.gradient} text-white` : `border ${config.border} ${config.bg} ${config.text}`}`}
                                >
                                    <span>{getStatusLabel(status)}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${filter === status ? 'bg-white/20' : config.bg}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    {filteredRequests.map((request) => {
                        const config = statusConfig[request.status];
                        const priorityCfg = priorityConfig[request.priority || 'medium'];
                        const requester = getRequesterName(request);
                        const phone = getPhone(request);

                        return (
                            <div
                                key={request.id}
                                onClick={() => openDetailModal(request)}
                                className={`cursor-pointer rounded-xl border ${config.border} ${config.bg} p-4 transition-all hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${config.text}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                            {request.client_id && (
                                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                                                    {isArabic ? 'عميل' : 'Client'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-base font-bold text-white truncate">{requester}</p>
                                        <p className="text-xs font-medium text-gray-500 mt-1">{getServiceSummary(request)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-emerald-400">{request.estimated_total.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold uppercase text-gray-500">{request.price_currency}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1 text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(request.created_at).toLocaleDateString()}
                                    </span>
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${priorityCfg.bg} ${priorityCfg.color}`}>
                                        <Flag className="w-3 h-3" />
                                        {getPriorityLabel(request.priority || 'medium')}
                                    </span>
                                    {request.assigned_to && (
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <User className="w-3 h-3" />
                                            {request.assigned_to}
                                        </span>
                                    )}
                                    {phone && (
                                        <a 
                                            href={`https://wa.me/2${phone.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                                        >
                                            <Phone className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredRequests.length === 0 && (
                        <div className="py-12 text-center text-sm text-gray-500">
                            {isArabic ? 'لا توجد طلبات' : 'No requests found'}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-56 shrink-0 space-y-3">
                <div className="rounded-xl border border-[#333] bg-[#1a1a1a] p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">{isArabic ? 'إجمالي المحفظة' : 'Pipeline'}</h3>
                    <p className="text-2xl font-black text-emerald-400">{pipelineStats.totalValue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mb-4">EGP</p>
                    <div className="space-y-2">
                        {(Object.keys(statusConfig) as PricingRequest['status'][]).map((status) => {
                            const config = statusConfig[status];
                            return (
                                <div key={status} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
                                        <span className="text-xs font-medium text-gray-400">{getStatusLabel(status)}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white">{statusCounts[status]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-xl border border-[#333] bg-[#1a1a1a] p-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">{isArabic ? 'أنواع الطلبات' : 'Request Types'}</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400">{isArabic ? 'باقات' : 'Package'}</span>
                            <span className="text-xs font-bold text-white">{pipelineStats.packageCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400">{isArabic ? 'مخصص' : 'Custom'}</span>
                            <span className="text-xs font-bold text-white">{pipelineStats.customCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-[#333]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-white">
                            <FileText className="w-5 h-5 text-emerald-400" />
                            <span>{isArabic ? 'تفاصيل الطلب' : 'Request Details'}</span>
                            {selectedRequest && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[selectedRequest.status].bg} ${statusConfig[selectedRequest.status].text} border ${statusConfig[selectedRequest.status].border}`}>
                                    {getStatusLabel(selectedRequest.status)}
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-[#333] bg-[#0f0f0f] p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'العميل' : 'Client'}</span>
                                    </div>
                                    <p className="font-bold text-white">{getRequesterName(selectedRequest)}</p>
                                    {selectedRequest.company_name && (
                                        <p className="text-xs text-gray-500 mt-1">{selectedRequest.company_name}</p>
                                    )}
                                </div>
                                <div className="rounded-lg border border-[#333] bg-[#0f0f0f] p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-gray-500" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'الإجمالي' : 'Total'}</span>
                                    </div>
                                    <p className="font-bold text-emerald-400 text-lg">{selectedRequest.estimated_total.toLocaleString()} {selectedRequest.price_currency}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {getPhone(selectedRequest) && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Phone className="w-4 h-4 text-emerald-400" />
                                        <span className="text-white">{getPhone(selectedRequest)}</span>
                                    </div>
                                )}
                                {getEmail(selectedRequest) && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Mail className="w-4 h-4 text-emerald-400" />
                                        <span className="text-white truncate">{getEmail(selectedRequest)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-[#333] p-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="w-4 h-4 text-gray-500" />
                                    <span className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'الباقة / الخدمات' : 'Package / Services'}</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{isArabic ? 'النوع' : 'Type'}:</span>
                                        <span className="font-medium text-white">{selectedRequest.request_type === 'package' ? (isArabic ? 'باقة جاهزة' : 'Ready Package') : (isArabic ? 'خطة مخصصة' : 'Custom Plan')}</span>
                                    </div>
                                    {selectedRequest.package_name && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">{isArabic ? 'الباقة' : 'Package'}:</span>
                                            <span className="font-medium text-white">{selectedRequest.package_name}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{isArabic ? 'المجموع الفرعي' : 'Subtotal'}:</span>
                                        <span className="font-medium text-white">{selectedRequest.estimated_subtotal.toLocaleString()} {selectedRequest.price_currency}</span>
                                    </div>
                                    {selectedRequest.selected_services.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs font-bold text-gray-500 mb-2">{isArabic ? 'الخدمات المختارة' : 'Selected Services'}:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedRequest.selected_services.map((service) => (
                                                    <span key={service.id} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/30">
                                                        {service.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'الأولوية' : 'Priority'}</label>
                                    <Select value={localPriority} onValueChange={(v) => setLocalPriority(v as Priority)}>
                                        <SelectTrigger className="mt-1 bg-[#0f0f0f] border-[#333] text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                                            {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                                                <SelectItem key={p} value={p} className="text-white hover:bg-[#333]">
                                                    <span className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${priorityConfig[p].bg.replace('bg-', 'bg-')}`} />
                                                        {getPriorityLabel(p)}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'تعيين إلى' : 'Assign To'}</label>
                                    <Select value={localAssign || 'unassigned'} onValueChange={(v) => setLocalAssign(v === 'unassigned' ? null : v)}>
                                        <SelectTrigger className="mt-1 bg-[#0f0f0f] border-[#333] text-white">
                                            <SelectValue placeholder={isArabic ? 'غير معين' : 'Unassigned'} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1a1a1a] border-[#333]">
                                            <SelectItem value="unassigned" className="text-gray-400 hover:bg-[#333]">{isArabic ? 'غير معين' : 'Unassigned'}</SelectItem>
                                            {mockTeamMembers.map((member) => (
                                                <SelectItem key={member.id} value={member.name} className="text-white hover:bg-[#333]">{member.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500">{isArabic ? 'ملاحظات الأدمن' : 'Admin Notes'}</label>
                                <textarea
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    placeholder={isArabic ? 'ملاحظات داخلية...' : 'Internal notes...'}
                                    rows={3}
                                    className="mt-1 w-full resize-none rounded-lg border border-[#333] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">{isArabic ? 'إجراءات سريعة' : 'Quick Actions'}</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRequest.status !== 'new' && (
                                        <button
                                            onClick={() => { onUpdateStatus(selectedRequest, 'new'); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                                        >
                                            {isArabic ? 'جديد' : 'New'}
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'reviewing' && (
                                        <button
                                            onClick={() => { onUpdateStatus(selectedRequest, 'reviewing'); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                        >
                                            {isArabic ? 'مراجعة' : 'Review'}
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'approved' && (
                                        <button
                                            onClick={() => { onUpdateStatus(selectedRequest, 'approved'); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                        >
                                            {isArabic ? 'اعتماد' : 'Approve'}
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'converted' && selectedRequest.client_id && (
                                        <button
                                            onClick={() => { onConvert(selectedRequest); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                                        >
                                            {isArabic ? 'تحويل' : 'Convert'}
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'rejected' && (
                                        <button
                                            onClick={() => { onUpdateStatus(selectedRequest, 'rejected'); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                        >
                                            {isArabic ? 'رفض' : 'Reject'}
                                        </button>
                                    )}
                                    {selectedRequest.status !== 'cancelled' && (
                                        <button
                                            onClick={() => { onUpdateStatus(selectedRequest, 'cancelled'); setSelectedRequest(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-500/30 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                                        >
                                            {isArabic ? 'إلغاء' : 'Cancel'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => { onDelete(selectedRequest.id); setSelectedRequest(null); }}
                                    className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {isArabic ? 'إلغاء بدون حذف' : 'Cancel without deleting'}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedRequest(null)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold border border-[#333] bg-[#0f0f0f] text-gray-400 hover:bg-[#333]"
                                    >
                                        {isArabic ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={saveModalChanges}
                                        className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600"
                                    >
                                        {isArabic ? 'حفظ' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
});

PricingRequestsManager.displayName = 'PricingRequestsManager';
