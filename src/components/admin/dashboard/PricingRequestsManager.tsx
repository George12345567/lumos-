import { memo, useMemo, useState } from 'react';
import { PricingRequest } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, FileText, RefreshCw, Trash2, XCircle, ArrowRightLeft, Search, Clock, MessageSquare, Eye } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { adminText } from '@/data/adminI18n';

interface PricingRequestsManagerProps {
    requests: PricingRequest[];
    onUpdateStatus: (request: PricingRequest, status: PricingRequest['status']) => void;
    onDelete: (id: string) => void;
    onConvert: (request: PricingRequest) => void;
    onSaveAdminNotes?: (request: PricingRequest, adminNotes: string) => Promise<void> | void;
    onOpenClient?: (request: PricingRequest) => void;
}

type RequestFilter = 'all' | PricingRequest['status'];

const statusTone: Record<PricingRequest['status'], string> = {
    new: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    reviewing: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    converted: 'bg-violet-100 text-violet-700 border-violet-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

const statusLabel = (status: PricingRequest['status']) => {
    if (status === 'reviewing') return 'Reviewing';
    if (status === 'approved') return 'Approved';
    if (status === 'converted') return 'Converted';
    if (status === 'rejected') return 'Rejected';
    return 'New';
};

export const PricingRequestsManager = memo(({ requests, onUpdateStatus, onDelete, onConvert, onSaveAdminNotes, onOpenClient }: PricingRequestsManagerProps) => {
    const { isArabic } = useLanguage();
    const tx = (key: Parameters<typeof adminText>[0]) => adminText(key, isArabic);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<RequestFilter>('all');
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

    const newCount = useMemo(() => requests.filter(r => r.status === 'new').length, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const requester = request.company_name
                || request.guest_name
                || (typeof request.client_snapshot?.display_name === 'string' ? request.client_snapshot.display_name : null)
                || (typeof request.client_snapshot?.username === 'string' ? request.client_snapshot.username : null)
                || '';
            const haystack = [
                requester,
                request.package_name || '',
                request.guest_phone || '',
                request.guest_email || '',
                request.request_notes || '',
                request.admin_notes || '',
            ].join(' ').toLowerCase();

            const matchesSearch = haystack.includes(search.toLowerCase());
            const matchesFilter = filter === 'all' ? true : request.status === filter;
            return matchesSearch && matchesFilter;
        });
    }, [filter, requests, search]);

    const pipelineStats = useMemo(() => {
        const reviewing = requests.filter(request => request.status === 'reviewing').length;
        const approved = requests.filter(request => request.status === 'approved' || request.status === 'converted').length;
        const custom = requests.filter(request => request.request_type === 'custom').length;
        const pipelineValue = requests.reduce((sum, request) => sum + (request.estimated_total || 0), 0);

        return {
            reviewing,
            approved,
            custom,
            pipelineValue,
        };
    }, [requests]);

    const updateDraft = (request: PricingRequest, value: string) => {
        setNotesDraft((prev) => ({ ...prev, [request.id]: value }));
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

    return (
        <Card className="h-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-cyan-500" />
                            {tx('pricingRequests')}
                        </CardTitle>
                        <Badge variant="outline">{newCount} {tx('new')}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Pipeline</p>
                            <p className="mt-2 text-lg font-black text-cyan-700">{pipelineStats.pipelineValue.toLocaleString()}</p>
                            <p className="text-[11px] text-cyan-600">EGP total value</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Reviewing</p>
                            <p className="mt-2 text-lg font-black text-amber-700">{pipelineStats.reviewing}</p>
                            <p className="text-[11px] text-amber-600">Needs admin follow-up</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Approved+</p>
                            <p className="mt-2 text-lg font-black text-emerald-700">{pipelineStats.approved}</p>
                            <p className="text-[11px] text-emerald-600">Ready or converted</p>
                        </div>
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Custom</p>
                            <p className="mt-2 text-lg font-black text-indigo-700">{pipelineStats.custom}</p>
                            <p className="text-[11px] text-indigo-600">Custom-scope requests</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={tx('searchRequesterPackage')}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'new', 'reviewing', 'approved', 'converted', 'rejected'] as RequestFilter[]).map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-all ${filter === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700'}`}
                                >
                                    {item === 'all' ? (isArabic ? 'الكل' : 'all') : item === 'new' ? tx('new') : item === 'reviewing' ? tx('reviewing') : item === 'approved' ? tx('approved') : item === 'converted' ? tx('converted') : tx('rejected')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <ScrollArea className="h-[560px] pr-2">
                    <div className="space-y-3">
                        {filteredRequests.map((request) => {
                            const serviceSummary = request.request_type === 'package'
                                ? (request.package_name || 'Package request')
                                : `${request.selected_services.length} selected service${request.selected_services.length === 1 ? '' : 's'}`;
                            const requester = request.company_name
                                || request.guest_name
                                || (typeof request.client_snapshot?.display_name === 'string' ? request.client_snapshot.display_name : null)
                                || (typeof request.client_snapshot?.username === 'string' ? request.client_snapshot.username : null)
                                || 'Unknown requester';
                            const phone = request.guest_phone
                                || (typeof request.client_snapshot?.phone === 'string' ? request.client_snapshot.phone : null)
                                || null;
                            const email = request.guest_email
                                || (typeof request.client_snapshot?.email === 'string' ? request.client_snapshot.email : null)
                                || null;
                            const notesValue = notesDraft[request.id] ?? request.admin_notes ?? '';

                            return (
                                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-slate-900 truncate">{requester}</p>
                                                {request.client_id && (
                                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                        Client
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-slate-500">{serviceSummary}</p>
                                        </div>
                                        <Badge className={statusTone[request.status]}>{statusLabel(request.status)}</Badge>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{request.request_type === 'package' ? 'Ready Package' : 'Custom Plan'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Estimated Total</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{request.estimated_total.toLocaleString()} {request.price_currency}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Submitted</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{new Date(request.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Request Source</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{request.request_source || 'pricing_modal'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Reviewed</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'Pending review'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</span>
                                            <span className="mt-1 block font-semibold text-slate-700">{phone || 'Not shared'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</span>
                                            <span className="mt-1 block font-semibold text-slate-700 break-all">{email || 'Not shared'}</span>
                                        </div>
                                    </div>

                                    {request.selected_services.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {request.selected_services.map((service) => (
                                                <span key={`${request.id}-${service.id}`} className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
                                                    {service.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {request.request_notes && (
                                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
                                            {request.request_notes}
                                        </div>
                                    )}

                                    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin Notes</p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{request.updated_at ? new Date(request.updated_at).toLocaleDateString() : 'Just submitted'}</span>
                                            </div>
                                        </div>
                                        <textarea
                                            value={notesValue}
                                            onChange={(event) => updateDraft(request, event.target.value)}
                                            placeholder="Internal pricing notes, negotiation notes, delivery constraints..."
                                            rows={3}
                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                                        />
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {onSaveAdminNotes && (
                                                <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => saveNotes(request)} disabled={savingNotesId === request.id}>
                                                    <MessageSquare className="mr-1 h-3 w-3" /> {savingNotesId === request.id ? tx('saving') : tx('saveNotes')}
                                                </Button>
                                            )}
                                            {request.client_id && onOpenClient && (
                                                <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => onOpenClient(request)}>
                                                    <Eye className="mr-1 h-3 w-3" /> {tx('openClientControl')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {request.status === 'new' && (
                                            <Button size="sm" variant="outline" className="h-8 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => onUpdateStatus(request, 'reviewing')}>
                                                <RefreshCw className="mr-1 h-3 w-3" /> {tx('review')}
                                            </Button>
                                        )}
                                        {(request.status === 'new' || request.status === 'reviewing') && (
                                            <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onUpdateStatus(request, 'approved')}>
                                                <CheckCircle className="mr-1 h-3 w-3" /> {tx('approve')}
                                            </Button>
                                        )}
                                        {request.status !== 'rejected' && request.status !== 'converted' && (
                                            <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onUpdateStatus(request, 'rejected')}>
                                                <XCircle className="mr-1 h-3 w-3" /> {tx('reject')}
                                            </Button>
                                        )}
                                        {request.client_id && request.status !== 'converted' && (
                                            <Button size="sm" className="h-8 bg-slate-900 text-white hover:bg-slate-800" onClick={() => onConvert(request)}>
                                                <ArrowRightLeft className="mr-1 h-3 w-3" /> {tx('convertToOrder')}
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(request.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredRequests.length === 0 && (
                            <div className="py-16 text-center text-sm text-slate-400">
                                {tx('noPricingRequestsMatch')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
});

PricingRequestsManager.displayName = 'PricingRequestsManager';