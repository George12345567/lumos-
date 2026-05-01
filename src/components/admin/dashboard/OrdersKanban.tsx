import { memo, useMemo } from 'react';
import { Order } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CheckCircle, XCircle, MoreHorizontal, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { adminText } from '@/data/adminI18n';

interface OrdersKanbanProps {
    orders: Order[];
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (id: string) => void;
}

// Static Tailwind class map — dynamic interpolation (e.g. `text-${color}-500`) doesn't work with Tailwind JIT
const colorMap: Record<string, { border: string; bg: string; icon: string; text: string }> = {
    orange: { border: 'border-orange-100', bg: 'bg-orange-50/50', icon: 'text-orange-500', text: 'text-orange-700' },
    blue: { border: 'border-blue-100', bg: 'bg-blue-50/50', icon: 'text-blue-500', text: 'text-blue-700' },
    green: { border: 'border-green-100', bg: 'bg-green-50/50', icon: 'text-green-500', text: 'text-green-700' },
    red: { border: 'border-red-100', bg: 'bg-red-50/50', icon: 'text-red-500', text: 'text-red-700' },
};

export const OrdersKanban = memo(({ orders, onUpdateStatus, onDelete }: OrdersKanbanProps) => {
    const { isArabic } = useLanguage();

    const columns = useMemo(() => [
        { id: 'pending', title: adminText('pendingOrders', isArabic), color: 'orange', icon: Clock },
        { id: 'processing', title: adminText('processingOrders', isArabic), color: 'blue', icon: MoreHorizontal },
        { id: 'completed', title: adminText('completedOrders', isArabic), color: 'green', icon: CheckCircle },
        { id: 'cancelled', title: adminText('cancelledOrders', isArabic), color: 'red', icon: XCircle },
    ], [isArabic]);

    const columnOrders = useMemo(() => {
        const map: Record<string, Order[]> = {};
        for (const o of orders) {
            if (!map[o.status]) map[o.status] = [];
            map[o.status].push(o);
        }
        return map;
    }, [orders]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[600px] overflow-hidden">
            {columns.map(col => {
                const colOrders = columnOrders[col.id] ?? [];
                const colors = colorMap[col.color];

                return (
                    <div key={col.id} className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200">
                        {/* Column Header */}
                        <div className={`p-3 border-b ${colors.border} ${colors.bg} rounded-t-xl flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <col.icon className={`w-4 h-4 ${colors.icon}`} />
                                <span className={`font-bold text-sm ${colors.text} uppercase`}>{col.title}</span>
                            </div>
                            <Badge variant="secondary" className="bg-white/50">{colOrders.length}</Badge>
                        </div>

                        {/* Drop / List Area */}
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-2">
                                {colOrders.length === 0 && (
                                    <div className="text-center py-8 text-slate-300 text-xs italic">
                                        {adminText('noOrders', isArabic)}
                                    </div>
                                )}
                                {colOrders.map(order => (
                                    <Card key={order.id} className="bg-white hover:shadow-md transition-shadow cursor-pointer group relative hover:border-purple-200">
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{order.client_name}</h4>
                                                <span className="text-xs font-mono text-slate-400">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-500 mb-2">{order.phone}</p>

                                            <div className="flex items-center justify-between mt-3">
                                                <Badge variant="outline" className="text-[10px] font-normal border-slate-100 bg-slate-50">
                                                    {order.total_price} EGP
                                                </Badge>

                                                {/* Quick Actions */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {col.id !== 'completed' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-green-600 hover:bg-green-50"
                                                            title={adminText('advanceStatus', isArabic)}
                                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, getNextStatus(col.id)); }}
                                                        >
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                );
            })}
        </div>
    );
});

OrdersKanban.displayName = 'OrdersKanban';

const getNextStatus = (current: string) => {
    switch (current) {
        case 'pending': return 'processing';
        case 'processing': return 'completed';
        default: return 'completed';
    }
};
