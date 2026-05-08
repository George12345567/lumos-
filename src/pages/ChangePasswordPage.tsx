import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAuthActions,
  useAuthConfigured,
  useClient,
  useProfileLoading,
} from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/lib/constants';
import { getPasswordRules, isStrongPassword } from '@/lib/validation';
import { changeTemporaryPassword } from '@/services/authService';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const client = useClient();
  const profileLoading = useProfileLoading();
  const authConfigured = useAuthConfigured();
  const { logout, refreshProfile } = useAuthActions();
  const { t, isArabic } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading || !client) return;
    if (!client.password_must_change) {
      navigate(ROUTES.CLIENT_PROFILE, { replace: true });
    }
  }, [client, navigate, profileLoading]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate(ROUTES.CLIENT_LOGIN, { replace: true });
  }, [logout, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    setError(null);

    if (!isStrongPassword(newPassword)) {
      setError(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أحرفاً كبيرة وصغيرة ورقماً.', 'Password must be at least 8 characters and include uppercase, lowercase, and a number.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('كلمتا المرور غير متطابقتين.', 'Passwords do not match.'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await changeTemporaryPassword(newPassword);
      if (!result.success) {
        setError(t('تعذّر تغيير كلمة المرور. حاول مرة أخرى أو تواصل مع الدعم.', 'Could not change your password. Try again or contact support.'));
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      await refreshProfile();
      toast.success(t('تم تغيير كلمة المرور بنجاح.', 'Password changed successfully.'));
      navigate(ROUTES.CLIENT_PROFILE, { replace: true });
    } finally {
      setSubmitting(false);
    }
  }, [confirmPassword, navigate, newPassword, refreshProfile, submitting, t]);

  if (profileLoading && !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rules = getPasswordRules(newPassword, confirmPassword);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground" dir={isArabic ? 'rtl' : 'ltr'}>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-card-foreground">
                {t('غيّر كلمة المرور', 'Change your password')}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t(
                  'تم تعيين كلمة مرور مؤقتة لحسابك. اختر كلمة مرور جديدة قبل الدخول إلى ملفك.',
                  'A temporary password was set for your account. Choose a new password before entering your profile.',
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <PasswordField
              label={t('كلمة المرور الجديدة', 'New password')}
              value={newPassword}
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((value) => !value)}
              onChange={setNewPassword}
            />

            <PasswordField
              label={t('تأكيد كلمة المرور', 'Confirm password')}
              value={confirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              onChange={setConfirmPassword}
            />

            {newPassword && (
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div key={rule.en} className="flex items-center gap-2 text-xs">
                      {rule.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={rule.ok ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {t(rule.ar, rule.en)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {!authConfigured && (
              <p className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t('إعدادات المصادقة غير مكتملة. تواصل مع دعم Lumos.', 'Authentication is not configured. Contact Lumos support.')}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !authConfigured}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {t('تحديث كلمة المرور', 'Update password')}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              {t('تسجيل الخروج', 'Sign out')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <span className="relative block">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="h-12 w-full rounded-2xl border border-border bg-background px-4 pr-12 text-sm text-foreground outline-none transition focus:border-primary"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}
