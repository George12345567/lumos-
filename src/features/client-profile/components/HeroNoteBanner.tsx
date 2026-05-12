import { AlertTriangle, Bell, CheckCircle2, ExternalLink, MessageSquare, X } from 'lucide-react';
import { useCallback } from 'react';

interface HeroNoteBannerProps {
  notes: Array<{
    id: string;
    title: string;
    body: string;
    priority: 'normal' | 'important' | 'urgent';
    is_dismissible: boolean;
    read_at?: string | null;
  }>;
  isArabic?: boolean;
  onMarkRead?: (noteId: string) => Promise<void> | void;
  onNavigateMessages?: () => void;
}

const priorityStyles: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  urgent: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    text: 'text-red-900',
    icon: 'text-red-500',
  },
  important: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    icon: 'text-amber-500',
  },
  normal: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    icon: 'text-slate-400',
  },
};

export function HeroNoteBanner({ notes, isArabic, onMarkRead, onNavigateMessages }: HeroNoteBannerProps) {
  const handleMarkRead = useCallback(
    (noteId: string) => {
      void onMarkRead?.(noteId);
    },
    [onMarkRead],
  );

  const activeNotes = notes.filter((n) => !n.read_at);

  if (activeNotes.length === 0) return null;

  const PriorityIcon = ({ priority }: { priority: string }) => {
    const style = priorityStyles[priority] || priorityStyles.normal;
    if (priority === 'urgent') return <AlertTriangle className={`h-4 w-4 ${style.icon} shrink-0`} />;
    if (priority === 'important') return <Bell className={`h-4 w-4 ${style.icon} shrink-0`} />;
    return <MessageSquare className={`h-4 w-4 ${style.icon} shrink-0`} />;
  };

  return (
    <div className="space-y-2" dir={isArabic ? 'rtl' : 'ltr'}>
      {activeNotes.map((note) => {
        const style = priorityStyles[note.priority] || priorityStyles.normal;
        return (
          <div
            key={note.id}
            className={`rounded-xl border ${style.border} ${style.bg} px-4 py-3 flex items-start gap-3`}
          >
            <PriorityIcon priority={note.priority} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`text-sm font-semibold ${style.text}`}>{note.title}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{note.body}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onNavigateMessages && (
                  <button
                    type="button"
                    onClick={onNavigateMessages}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-foreground transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {isArabic ? 'راسلنا' : 'Message us'}
                  </button>
                )}
              </div>
            </div>
            {note.is_dismissible && onMarkRead && (
              <button
                type="button"
                onClick={() => handleMarkRead(note.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition"
                title={isArabic ? 'تمييز كمقروء' : 'Mark as read'}
              >
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}