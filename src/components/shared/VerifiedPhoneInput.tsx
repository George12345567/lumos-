/**
 * ════════════════════════════════════════════════════════════════════
 * VerifiedPhoneInput.tsx
 * 
 * A premium, self-contained phone input with built-in SMS OTP verification.
 *
 * FEATURES:
 *  - Country code selector (E.164 format output)
 *  - Inline OTP input (6 individual character boxes)
 *  - 60-second resend countdown timer
 *  - Rate limiting awareness (shows user-friendly error)
 *  - Verified state persists & blocks re-entry
 *  - onVerify(phone) callback for parent form gates
 *  - isArabic / isEnglish layout + copy
 *  - Detects if user is already verified (via isAlreadyVerified prop)
 *
 * USAGE:
 *  <VerifiedPhoneInput
 *    value={phone}
 *    onChange={setPhone}
 *    onVerify={(verifiedPhone) => setIsPhoneVerified(true)}
 *    isArabic={isAr}
 *    isAlreadyVerified={user?.is_phone_verified === true}
 *    label="رقم الهاتف"
 *    required
 *  />
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, Phone, RefreshCcw, Loader2, ShieldCheck, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ── Country Code List ─────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+249', flag: '🇸🇩', name: 'Sudan' },
  { code: '+218', flag: '🇱🇾', name: 'Libya' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
];

// ── Types ──────────────────────────────────────────────────────────
type VerifyState = 'idle' | 'sending' | 'awaiting_otp' | 'verifying' | 'verified' | 'error';

interface VerifiedPhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  onVerify: (fullPhone: string) => void;
  isArabic?: boolean;
  label?: string;
  required?: boolean;
  isAlreadyVerified?: boolean;
  disabled?: boolean;
  className?: string;
  /** Pass additional Tailwind classes for the outer input wrapper */
  inputClassName?: string;
}

// ── Helper: Supabase Edge Function URL ────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function callEdgeFn(name: string, body: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success?: boolean; error?: string; message?: string; dev_otp?: string }>;
}

// ── Component ─────────────────────────────────────────────────────
export const VerifiedPhoneInput: React.FC<VerifiedPhoneInputProps> = ({
  value,
  onChange,
  onVerify,
  isArabic = false,
  label,
  required = false,
  isAlreadyVerified = false,
  disabled = false,
  className = '',
  inputClassName = '',
}) => {
  const [countryCode, setCountryCode] = useState('+20');
  const [localNumber, setLocalNumber] = useState('');
  const [state, setState] = useState<VerifyState>(isAlreadyVerified ? 'verified' : 'idle');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = useCallback((ar: string, en: string) => (isArabic ? ar : en), [isArabic]);

  // Whenever localNumber or countryCode changes, update the parent
  useEffect(() => {
    const full = localNumber ? `${countryCode}${localNumber.replace(/^0/, '')}` : '';
    onChange(full);
  }, [localNumber, countryCode, onChange]);

  // If already verified externally, set state
  useEffect(() => {
    if (isAlreadyVerified) setState('verified');
  }, [isAlreadyVerified]);

  const fullPhone = `${countryCode}${localNumber.replace(/^0/, '')}`;

  // ── Cooldown Timer ───────────────────────────────────────────────
  const startCooldown = useCallback((seconds = 60) => {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  // ── Send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setErrorMsg('');
    const digits = localNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      setErrorMsg(t('أدخل رقم هاتف صحيح (على الأقل 7 أرقام)', 'Enter a valid phone number (at least 7 digits)'));
      return;
    }
    setState('sending');
    try {
      const result = await callEdgeFn('send-otp', { phone: fullPhone });
      if (result.error) {
        setErrorMsg(result.error);
        setState('idle');
        // Show dev OTP in dev mode
        if (result.dev_otp) {
          toast(`[DEV] OTP: ${result.dev_otp}`, { duration: 30000 });
          setState('awaiting_otp');
          startCooldown(60);
        }
        return;
      }
      // Dev environment returns dev_otp
      if (result.dev_otp) {
        toast(`[DEV] OTP: ${result.dev_otp}`, { duration: 30000 });
      }
      setState('awaiting_otp');
      setOtp(Array(6).fill(''));
      startCooldown(60);
      toast.success(t('تم إرسال الكود بنجاح!', 'Verification code sent!'), {
        description: t('تحقق من رسائل هاتفك', 'Check your SMS messages'),
        style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
      });
      // Auto-focus first OTP box
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setState('idle');
      setErrorMsg(t('حدث خطأ في إرسال الكود. حاول مرة أخرى.', 'Failed to send code. Please try again.'));
    }
  };

  // ── OTP Box Key Handler ──────────────────────────────────────────
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== '') && next.length === 6) handleVerify(next.join(''));
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // Support paste: fill all 6 boxes at once
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      handleVerify(pasted);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────
  const handleVerify = async (code: string) => {
    setState('verifying');
    setErrorMsg('');
    try {
      const result = await callEdgeFn('verify-otp', { phone: fullPhone, otp: code });
      if (result.error) {
        setState('awaiting_otp');
        setErrorMsg(result.error);
        setOtp(Array(6).fill(''));
        otpRefs.current[0]?.focus();
        return;
      }
      setState('verified');
      onVerify(fullPhone);
      toast.success(t('تم التأكيد بنجاح ✅', 'Phone verified successfully ✅'), {
        style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
      });
    } catch {
      setState('awaiting_otp');
      setErrorMsg(t('خطأ في التحقق. جرب مرة أخرى.', 'Verification error. Please try again.'));
    }
  };

  // Allow user to change phone if not yet verified
  const handleReset = () => {
    setState('idle');
    setOtp(Array(6).fill(''));
    setErrorMsg('');
    setCooldown(0);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className={`space-y-3 ${className}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-emerald-600">*</span>}
        </label>
      )}

      {/* Phone Input Row */}
      <div className={`flex gap-2 items-stretch ${inputClassName}`}>
        {/* Country code selector */}
        <select
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
          disabled={disabled || state === 'verified' || state === 'sending' || state === 'verifying' || state === 'awaiting_otp'}
          className="shrink-0 h-11 px-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all disabled:opacity-60 max-w-[90px]"
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>

        {/* Phone number field */}
        <div className="relative flex-1">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={localNumber}
            onChange={e => setLocalNumber(e.target.value.replace(/[^\d\s()+-]/g, ''))}
            disabled={disabled || state === 'verified' || state === 'sending' || state === 'verifying' || state === 'awaiting_otp'}
            placeholder={t('01X XXXX XXXX', '05XX XXX XXXX')}
            className={`w-full h-11 px-4 rounded-xl border text-sm font-medium transition-all outline-none pr-10 ${state === 'verified'
                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800'
                : state === 'awaiting_otp'
                  ? 'border-amber-300 bg-amber-50/40 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
              } disabled:opacity-80 disabled:cursor-not-allowed`}
          />
          {/* Verified tick inside input */}
          {state === 'verified' && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
          )}
        </div>

        {/* Action button: Send / Resend */}
        {state === 'idle' || state === 'error' ? (
          <button
            type="button"
            onClick={handleSendOtp}
            className="shrink-0 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-sm shadow-emerald-200 whitespace-nowrap"
          >
            {t('إرسال كود', 'Send Code')}
          </button>
        ) : state === 'sending' ? (
          <div className="shrink-0 h-11 px-4 flex items-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
            {t('يتم الإرسال...', 'Sending...')}
          </div>
        ) : state === 'verified' ? (
          <button
            type="button"
            onClick={handleReset}
            title={t('تغيير الرقم', 'Change number')}
            className="shrink-0 h-11 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-medium text-red-500"
          >
            ⚠ {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Verified banner */}
      <AnimatePresence>
        {state === 'verified' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {t('رقم الهاتف مؤكد ✅', 'Phone number verified ✅')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP Input — shown only when awaiting / verifying */}
      <AnimatePresence>
        {(state === 'awaiting_otp' || state === 'verifying') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-amber-800 text-center">
              {t(`أدخل الكود المرسل إلى ${fullPhone}`, `Enter the code sent to ${fullPhone}`)}
            </p>

            {/* 6-box OTP input */}
            <div className="flex justify-center gap-2" dir="ltr">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                  disabled={state === 'verifying'}
                  className="w-10 h-12 text-center text-lg font-black rounded-xl border-2 border-amber-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all disabled:opacity-60 text-slate-900"
                />
              ))}
            </div>

            {/* Verifying indicator */}
            {state === 'verifying' && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('جارٍ التحقق...', 'Verifying...')}
              </div>
            )}

            {/* Resend / Countdown */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">
                  {t(`يمكن إعادة الإرسال بعد ${cooldown} ثانية`, `Resend available in ${cooldown}s`)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mx-auto underline underline-offset-2"
                >
                  <RefreshCcw className="w-3 h-3" />
                  {t('إعادة إرسال الكود', 'Resend code')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifiedPhoneInput;