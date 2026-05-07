import { useState, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { DEFAULT_ACCENT } from './constants';
import type { TabId } from './constants';
import { SidebarNav, MobileTabBar } from './components/SidebarNav';
import { ProfileHero } from './sections/ProfileHero';
import { OverviewSection } from './sections/OverviewSection';
import { BrandStudioSection } from './sections/BrandStudioSection';
import { LibrarySection } from './sections/LibrarySection';
import { MessagesSection } from './sections/MessagesSection';
import { AccountSection } from './sections/AccountSection';
import { OrderTrackingSection } from './sections/OrderTrackingSection';
import {
  MOCK_CLIENT,
  MOCK_PROFILE,
  MOCK_ORDERS,
  MOCK_MESSAGES,
  MOCK_DESIGNS,
  MOCK_ASSETS,
  MOCK_ADMIN_NOTIFICATIONS,
} from './mockData';
import type { PortalMessage } from './hooks/usePortalData';

type ProfileData = typeof MOCK_PROFILE;

export default function ClientProfileTestView() {
  const { isArabic } = useLanguage();
  const [tab, setTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<ProfileData>({ ...MOCK_PROFILE, avatar_url: MOCK_CLIENT.avatar_url });
  const [messages, setMessages] = useState<PortalMessage[]>([...MOCK_MESSAGES]);

  const accent = profile.theme_accent || MOCK_CLIENT.theme_accent || DEFAULT_ACCENT;

  const update = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const optimisticAddMessage = useCallback((msg: PortalMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleDeleteDesign = useCallback(async (_id: string) => {
    // Mock — no-op
  }, []);

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
          {isArabic
            ? 'وضع المعاينة — بيانات تجريبية | لا يوجد اتصال فعلي بالخادم'
            : 'Preview Mode — Mock data · No real server connection'}
        </div>

        <ProfileHero
          clientId={MOCK_CLIENT.id}
          username={MOCK_CLIENT.username}
          packageName={MOCK_CLIENT.package_name}
          profile={profile}
          accent={accent}
          saveState="idle"
          onUpdate={update}
          isArabic={isArabic}
          isVerified={MOCK_CLIENT.is_verified}
          notifications={MOCK_ADMIN_NOTIFICATIONS}
          stats={{
            orders: MOCK_ORDERS.length,
            messages: messages.filter((m) => m.sender === 'team').length,
            progress: MOCK_CLIENT.progress,
          }}
        />

        <MobileTabBar active={tab} onChange={setTab} accent={accent} isArabic={isArabic} />

        <div className="mt-4 flex gap-5 lg:mt-6">
          <SidebarNav active={tab} onChange={setTab} accent={accent} isArabic={isArabic} />

          <div className="min-w-0 flex-1">
            {tab === 'overview' && (
              <OverviewSection
                profile={profile}
                clientInfo={{
                  email: MOCK_CLIENT.email,
                  phone_number: MOCK_CLIENT.phone_number,
                  company_name: MOCK_CLIENT.company_name,
                  industry: MOCK_CLIENT.industry,
                  role: MOCK_CLIENT.role,
                  username: MOCK_CLIENT.username,
                  is_verified: MOCK_CLIENT.is_verified,
                }}
                packageName={MOCK_CLIENT.package_name}
                status={MOCK_CLIENT.status}
                progress={MOCK_CLIENT.progress}
                nextSteps={MOCK_CLIENT.next_steps}
                accent={accent}
                onUpdate={update}
                isArabic={isArabic}
              />
            )}

            {tab === 'orders' && (
              <OrderTrackingSection
                orders={MOCK_ORDERS}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'messages' && (
              <MessagesSection
                clientId={MOCK_CLIENT.id}
                messages={messages}
                onOptimisticAdd={optimisticAddMessage}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'brand' && (
              <BrandStudioSection
                clientId={MOCK_CLIENT.id}
                profile={profile}
                accent={accent}
                onUpdate={update}
              />
            )}

            {tab === 'library' && (
              <LibrarySection
                designs={MOCK_DESIGNS}
                assets={MOCK_ASSETS}
                onDeleteDesign={handleDeleteDesign}
                accent={accent}
                isArabic={isArabic}
              />
            )}

            {tab === 'account' && (
              <AccountSection
                clientInfo={{
                  email: MOCK_CLIENT.email,
                  phone_number: MOCK_CLIENT.phone_number,
                  company_name: MOCK_CLIENT.company_name,
                  industry: MOCK_CLIENT.industry,
                  role: MOCK_CLIENT.role,
                  username: MOCK_CLIENT.username,
                }}
                profile={profile}
                onUpdate={update}
                onSignOut={() => {}}
                hasSecurityQuestion={Boolean(MOCK_CLIENT.security_question)}
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