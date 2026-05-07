import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import EnhancedNavbar from '@/components/layout/EnhancedNavbar';
import {
  useClient,
  useAuthActions,
  useAuthLoading,
  useIsAuthenticated,
  useProfileError,
  useProfileLoading,
} from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ProfileData } from '@/services/profileService';
import { useClientProfile } from './hooks/useClientProfile';
import { useProfileMutation } from './hooks/useProfileMutation';
import { useProfileTab } from './hooks/useProfileTab';
import { usePortalData } from './hooks/usePortalData';
import { useNotifications } from './hooks/useNotifications';
import { useOrders } from './hooks/useOrders';
import { adaptNotification, adaptOrder, adaptAsset } from './adapters';
import { SidebarNav, MobileTabBar } from './components/SidebarNav';
import { ProfileHero } from './sections/ProfileHero';
import { OverviewSection } from './sections/OverviewSection';
import { LibrarySection } from './sections/LibrarySection';
import { MessagesSection } from './sections/MessagesSection';
import { AccountSection } from './sections/AccountSection';
import { OrderTrackingSection } from './sections/OrderTrackingSection';
import { DEFAULT_ACCENT } from './constants';

export default function ClientProfilePage() {
  const client = useClient();
  const { logout, refreshProfile } = useAuthActions();
  const authLoading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();
  const profileError = useProfileError();
  const profileLoading = useProfileLoading();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const { profile, setField, loading } = useClientProfile();
  const { state: saveState, queue } = useProfileMutation();
  const { tab, setTab } = useProfileTab();
  const {
    messages,
    designs,
    assets,
    deleteDesign,
    optimisticAddMessage,
    sendMessage,
    reload: reloadPortal,
  } = usePortalData(client?.id);
  const { orders } = useOrders(client?.id);
  const { notifications } = useNotifications(client?.id);

  const adaptedOrders = useMemo(() => orders.map(adaptOrder), [orders]);
  const adaptedAssets = useMemo(() => assets.map(adaptAsset), [assets]);
  const adaptedNotifications = useMemo(() => notifications.map(adaptNotification), [notifications]);

  // Stats: derived strictly from real data (no faking).
  const activeProjects = useMemo(
    () =>
      orders.filter((o) => {
        const s = (o.status || '').toLowerCase();
        return s === 'pending' || s === 'reviewing' || s === 'approved' || s === 'in_progress';
      }).length,
    [orders],
  );

  // `client_messages` doesn't carry an is_read column, so use unread admin
  // notifications (which do) as the closest honest proxy for "fresh updates".
  const unreadMessages = useMemo(
    () => adaptedNotifications.filter((n) => !n.is_read).length,
    [adaptedNotifications],
  );

  const nextDelivery = useMemo(() => {
    const upcoming = orders
      .map((o) => o.estimated_delivery)
      .filter((d): d is string => !!d)
      .sort();
    return upcoming[0];
  }, [orders]);

  useEffect(() => {
    if (authLoading) return;
    // Only redirect to login when there's no Supabase session at all.
    // A transient profile-fetch failure must NOT log the user out.
    if (!isAuthenticated) navigate('/client-login', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const update = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setField(field, value);
    queue(field, value);
  };

  if (authLoading || (isAuthenticated && (profileLoading || loading) && !client)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isAuthenticated && (!client || !profile)) {
    return (
      <div className="min-h-screen bg-slate-50" dir={isArabic ? 'rtl' : 'ltr'}>
        <EnhancedNavbar />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isArabic ? 'تعذّر تحميل ملفك الشخصي' : 'We couldn’t load your profile'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {profileError
                ? isArabic
                  ? 'حدث خطأ أثناء جلب البيانات. أعد المحاولة، أو تواصل مع الدعم إذا استمرت المشكلة.'
                  : 'Something went wrong fetching your data. Try again, or contact support if it keeps happening.'
                : isArabic
                  ? 'لم نعثر على ملف عميل لحسابك بعد.'
                  : 'No client profile is linked to your account yet.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void refreshProfile()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isArabic ? 'إعادة المحاولة' : 'Try again'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/client-login', { replace: true });
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isArabic ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const accent = profile.theme_accent || client.theme_accent || DEFAULT_ACCENT;

  const handleSignOut = async () => {
    await logout();
    navigate('/client-login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir={isArabic ? 'rtl' : 'ltr'}>
      <EnhancedNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <ProfileHero
          clientId={client.id}
          username={client.username}
          packageName={client.package_name}
          profile={profile}
          accent={accent}
          saveState={saveState}
          onUpdate={update}
          isArabic={isArabic}
          isVerified={client.is_verified}
        />

        <MobileTabBar active={tab} onChange={setTab} accent={accent} isArabic={isArabic} />

        <div className="mt-5 flex gap-5 lg:mt-6">
          <SidebarNav
            active={tab}
            onChange={setTab}
            onSignOut={handleSignOut}
            accent={accent}
            isArabic={isArabic}
          />

          <div className="min-w-0 flex-1">
            {tab === 'overview' && (
              <OverviewSection
                profile={profile}
                clientInfo={{
                  email: client.email,
                  phone_number: client.phone_number,
                  company_name: client.company_name,
                  industry: client.industry,
                  role: client.role,
                  username: client.username,
                  is_verified: client.is_verified,
                }}
                packageName={client.package_name}
                status={client.status}
                progress={client.progress}
                nextSteps={client.next_steps}
                accent={accent}
                onUpdate={update}
                onEditAccount={() => setTab('account')}
                isArabic={isArabic}
                stats={{
                  activeProjects,
                  unreadMessages,
                  progress: client.progress ?? 0,
                  nextDelivery,
                }}
                recentActivity={adaptedNotifications}
              />
            )}

            {tab === 'projects' && (
              <OrderTrackingSection
                orders={adaptedOrders}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'messages' && (
              <MessagesSection
                clientId={client.id}
                messages={messages}
                onOptimisticAdd={optimisticAddMessage}
                onSendMessage={sendMessage}
                onRefresh={reloadPortal}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'files' && (
              <LibrarySection
                designs={designs}
                assets={adaptedAssets}
                onDeleteDesign={deleteDesign}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'account' && (
              <AccountSection
                clientId={client.id}
                clientInfo={{
                  email: client.email,
                  phone_number: client.phone_number,
                  company_name: client.company_name,
                  industry: client.industry,
                  role: client.role,
                  username: client.username,
                }}
                profile={profile}
                onUpdate={update}
                onSignOut={handleSignOut}
                hasSecurityQuestion={Boolean(client.security_question)}
                accent={accent}
                isArabic={isArabic}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
