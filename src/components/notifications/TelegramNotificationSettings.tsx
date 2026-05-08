import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTelegramIntegration,
  saveTelegramIntegration,
  sendTelegramTestNotification,
  type TelegramIntegrationSettings,
} from '@/services/telegramIntegrationService';
import { cn } from '@/lib/utils';

interface TelegramNotificationSettingsProps {
  clientId?: string | null;
  isArabic?: boolean;
  className?: string;
}

export function TelegramNotificationSettings({
  clientId,
  isArabic = false,
  className,
}: TelegramNotificationSettingsProps) {
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [settings, setSettings] = useState<TelegramIntegrationSettings | null>(null);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getTelegramIntegration();
        if (cancelled) return;
        setSettings(data);
        setChatId(data?.chat_id || '');
        setEnabled(Boolean(data?.enabled));
      } catch {
        if (!cancelled) toast.error(isArabic ? 'تعذر تحميل إعدادات Telegram' : 'Could not load Telegram settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isArabic]);

  const save = async () => {
    if (saving) return;
    if (!chatId.trim()) {
      toast.error(t('أدخل Chat ID أولاً.', 'Enter a chat ID first.'));
      return;
    }
    if (!settings && !botToken.trim()) {
      toast.error(t('أدخل Bot token لأول حفظ.', 'Enter a bot token for the first save.'));
      return;
    }

    setSaving(true);
    try {
      const result = await saveTelegramIntegration({
        clientId,
        botToken,
        chatId,
        enabled,
      });
      if (!result.success) {
        toast.error(result.error || t('تعذر حفظ إعدادات Telegram', 'Could not save Telegram settings'));
        return;
      }
      setSettings(result.settings ?? null);
      setBotToken('');
      toast.success(t('تم حفظ إعدادات Telegram', 'Telegram settings saved'));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const result = await sendTelegramTestNotification(clientId);
      if (!result.success) {
        toast.error(result.error || t('فشل اختبار Telegram', 'Telegram test failed'));
        return;
      }
      toast.success(t('تم إرسال اختبار Telegram', 'Telegram test sent'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bot className="h-4 w-4 text-emerald-600" />
            {t('إشعارات Telegram', 'Telegram Notifications')}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t(
              'يتم إرسال الإشعارات عبر وظيفة Supabase Edge بدون كشف التوكن في المتصفح بعد الحفظ.',
              'Notifications are sent through a Supabase Edge Function; saved tokens are never shown in the browser.',
            )}
          </p>
        </div>
        {settings ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck className="h-3 w-3" />
            {t('محفوظ', 'Saved')}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('جارٍ التحميل…', 'Loading…')}
        </div>
      ) : (
        <>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2">
            <span className="text-sm font-medium text-foreground">{t('تفعيل Telegram', 'Enable Telegram')}</span>
            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className={cn(
                'relative h-6 w-10 rounded-full transition',
                enabled ? 'bg-emerald-500' : 'bg-slate-200',
              )}
              aria-pressed={enabled}
            >
              <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition', enabled && 'translate-x-4')} />
            </button>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Bot token', 'Bot token')}
            </span>
            <input
              type="password"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder={settings ? t('التوكن محفوظ ومخفي', 'Saved token hidden') : '123456:ABC-DEF'}
              autoComplete="off"
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Chat ID', 'Chat ID')}
            </span>
            <input
              value={chatId}
              onChange={(event) => setChatId(event.target.value)}
              placeholder="-1001234567890"
              className={inputCls}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {saving ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ', 'Save')}
            </button>
            <button
              type="button"
              onClick={() => void test()}
              disabled={testing || !settings}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border px-4 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {testing ? t('جارٍ الإرسال…', 'Sending…') : t('إرسال اختبار', 'Send test')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const inputCls =
  'h-10 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export default TelegramNotificationSettings;
