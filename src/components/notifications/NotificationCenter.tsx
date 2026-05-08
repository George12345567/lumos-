import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  FileText,
  FolderKanban,
  Loader2,
  MessageCircle,
  Palette,
  RefreshCw,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/dashboard';
import { useNotificationCenter, type NotificationCenterScope } from '@/hooks/useNotificationCenter';

type NotificationFilter = 'all' | 'unread' | 'message' | 'file' | 'identity' | 'project';

interface NotificationCenterProps {
  scope?: NotificationCenterScope;
  align?: 'start' | 'center' | 'end';
  className?: string;
  buttonClassName?: string;
}

const FILTERS: Array<{ id: NotificationFilter; label: string; labelAr: string }> = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'unread', label: 'Unread', labelAr: 'غير مقروء' },
  { id: 'message', label: 'Messages', labelAr: 'رسائل' },
  { id: 'file', label: 'Files', labelAr: 'ملفات' },
  { id: 'identity', label: 'Identity', labelAr: 'هوية' },
  { id: 'project', label: 'Projects', labelAr: 'مشاريع' },
];

function iconForType(type: NotificationType) {
  if (type === 'message') return MessageCircle;
  if (type === 'file') return FileText;
  if (type === 'identity') return Palette;
  if (type === 'project') return FolderKanban;
  if (type === 'request' || type.startsWith('pricing_request')) return ClipboardList;
  if (type === 'security' || type === 'account') return Shield;
  return Bell;
}

function filterMatches(notification: Notification, filter: NotificationFilter) {
  if (filter === 'all') return true;
  if (filter === 'unread') return !notification.is_read;
  if (filter === 'message') return notification.type === 'message';
  if (filter === 'file') return notification.type === 'file';
  if (filter === 'identity') return notification.type === 'identity';
  if (filter === 'project') return notification.type === 'project';
  return true;
}

function timeAgo(date?: string | null, isArabic = false) {
  if (!date) return '';
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const units: Array<[number, string, string]> = [
    [60, 's', 'ث'],
    [60, 'm', 'د'],
    [24, 'h', 'س'],
    [7, 'd', 'ي'],
    [4.345, 'w', 'أ'],
    [12, 'mo', 'ش'],
    [Number.POSITIVE_INFINITY, 'y', 'سنة'],
  ];
  let value = seconds;
  for (const [size, en, ar] of units) {
    if (value < size) {
      const rounded = Math.max(1, Math.floor(value));
      return isArabic ? `منذ ${rounded}${ar}` : `${rounded}${en} ago`;
    }
    value /= size;
  }
  return '';
}

function safeInternalUrl(url?: string | null) {
  const trimmed = (url ?? '').trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') ? trimmed : null;
}

export function NotificationCenter({
  scope,
  align = 'end',
  className,
  buttonClassName,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const { isArabic, t } = useLanguage();
  const {
    scope: resolvedScope,
    canLoad,
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotificationCenter(scope);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => filterMatches(notification, filter)),
    [filter, notifications],
  );

  if (!canLoad) return null;

  const handleOpenNotification = async (notification: Notification) => {
    await markRead(notification.id);
    const url = safeInternalUrl(notification.action_url);
    if (url) navigate(url);
  };

  const handleViewAll = () => {
    if (resolvedScope === 'admin') {
      navigate('/lumos-admin?section=settings');
      return;
    }
    navigate('/profile?tab=overview');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground shadow-[0_10px_28px_rgba(2,6,23,0.08)] backdrop-blur-xl transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]',
            buttonClassName,
          )}
          aria-label={t('فتح مركز الإشعارات', 'Open notification center')}
          title={t('الإشعارات', 'Notifications')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold tabular-nums text-white shadow-sm ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={10}
        className={cn(
          'z-[90] w-[min(380px,calc(100vw-1.25rem))] overflow-hidden rounded-3xl border border-border bg-card/95 p-0 text-card-foreground shadow-[0_26px_70px_rgba(2,6,23,0.20)] backdrop-blur-2xl dark:bg-slate-950/95',
          className,
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                {t('الإشعارات', 'Notifications')}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unreadCount > 0
                  ? t(`${unreadCount} غير مقروء`, `${unreadCount} unread`)
                  : t('كل شيء محدث', "You're all caught up")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('تحديد الكل كمقروء', 'Mark all read')}</span>
            </button>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'h-8 shrink-0 rounded-full px-3 text-xs font-medium transition',
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-background/70 text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground',
                  )}
                >
                  {isArabic ? item.labelAr : item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('جاري تحميل الإشعارات', 'Loading notifications')}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-5 text-center">
              <p className="text-sm font-medium text-card-foreground">
                {t('تعذر تحميل الإشعارات', 'Could not load notifications')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('إعادة المحاولة', 'Retry')}
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-8 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium text-card-foreground">
                {t('كل شيء محدث', "You're all caught up.")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('ستظهر التحديثات المهمة هنا.', 'Important Lumos updates will appear here.')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => {
                const Icon = iconForType(notification.type);
                const highPriority = notification.priority === 'high' || notification.priority === 'urgent';
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleOpenNotification(notification)}
                    className={cn(
                      'group flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-muted',
                      !notification.is_read && 'bg-emerald-500/[0.07]',
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold text-card-foreground">
                          {isArabic ? notification.title_ar || notification.title : notification.title}
                        </span>
                        {!notification.is_read ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        ) : null}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                        {isArabic ? notification.message_ar || notification.message : notification.message}
                      </span>
                      <span className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{timeAgo(notification.created_at, isArabic)}</span>
                        {highPriority ? (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-600 dark:text-rose-300">
                            {notification.priority === 'urgent' ? t('عاجل', 'Urgent') : t('مهم', 'High')}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
          <button
            type="button"
            onClick={handleViewAll}
            className="rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {resolvedScope === 'admin' ? t('فتح الإعدادات', 'Open settings') : t('عرض النشاط', 'View activity')}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('تحديث', 'Refresh')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;
