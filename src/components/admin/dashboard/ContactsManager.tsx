import { memo, useMemo } from 'react';
import { Contact } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Trash2, CheckCircle, Mail, Building2, Briefcase, Wrench } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { adminText } from '@/data/adminI18n';

interface ContactsManagerProps {
    contacts: Contact[];
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (id: string) => void;
}

export const ContactsManager = memo(({ contacts, onUpdateStatus, onDelete }: ContactsManagerProps) => {
    const { isArabic } = useLanguage();
    const newCount = useMemo(() => contacts.filter(c => c.status === 'new').length, [contacts]);

    return (
        <Card className="h-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-pink-500" />
                        {adminText('inboxLeads', isArabic)}
                    </CardTitle>
                    <Badge variant="outline">{newCount} {adminText('newCount', isArabic)}</Badge>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                        {contacts.map(contact => {
                            // The message string is typically formatted from EnhancedContact as: 
                            // {message}\n\nBusiness: {businessName}\nIndustry: {industry}\nService Needed: {serviceNeeded}
                            
                            const parts = contact.message ? contact.message.split('\n\nBusiness: ') : [''];
                            const actualMessage = parts[0]?.trim() || '';
                            let business = '', industry = '', service = '';
                            
                            if (parts[1]) {
                                const details = parts[1].split('\n');
                                business = details[0]?.trim() || '';
                                
                                const indLine = details.find(line => line.startsWith('Industry: '));
                                if (indLine) industry = indLine.replace('Industry: ', '').trim();
                                
                                const servLine = details.find(line => line.startsWith('Service Needed: '));
                                if (servLine) service = servLine.replace('Service Needed: ', '').trim();
                            }

                            return (
                                <div
                                    key={contact.id}
                                    className={`p-4 rounded-xl border transition-all hover:bg-white hover:shadow-sm ${contact.status === 'new' ? 'bg-white border-pink-100 shadow-[0_4px_20px_rgba(236,72,153,0.08)]' : 'bg-slate-50 border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-bold ${contact.status === 'new' ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {contact.name}
                                            </h4>
                                            {contact.status === 'new' && <Badge className="bg-pink-500 hover:bg-pink-600 text-[10px] h-5 shadow-sm">NEW</Badge>}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {new Date(contact.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    {/* Detailed Tags */}
                                    {(business || industry || service) && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {business && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
                                                    <Building2 className="w-3 h-3 text-indigo-500" />
                                                    {business}
                                                </div>
                                            )}
                                            {industry && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-100 text-xs font-semibold text-cyan-700">
                                                    <Briefcase className="w-3 h-3 text-cyan-500" />
                                                    {industry}
                                                </div>
                                            )}
                                            {service && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                                                    <Wrench className="w-3 h-3 text-emerald-500" />
                                                    {service}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-3 relative group">
                                        <MessageSquare className="w-3 h-3 text-slate-300 absolute top-3 right-3 opacity-50" />
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {actualMessage || <span className="text-slate-400 italic">No additional message provided.</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100/60">
                                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{contact.phone}</span>
                                        <div className="flex gap-2">
                                            {contact.status === 'new' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 font-semibold"
                                                    onClick={() => onUpdateStatus(contact.id, 'read')}
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> {adminText('markRead', isArabic)}
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onDelete(contact.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {contacts.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                {adminText('noMessages', isArabic)}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
});

ContactsManager.displayName = 'ContactsManager';
