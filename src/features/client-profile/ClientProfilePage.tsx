import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import EnhancedNavbar from '@/components/layout/EnhancedNavbar';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ProfileData } from '@/services/profileService';
import { useClientProfile } from './hooks/useClientProfile';
import { useProfileMutation } from './hooks/useProfileMutation';
import { useProfileTab } from './hooks/useProfileTab';
import { usePortalData } from './hooks/usePortalData';
import { TabBar } from './components/TabBar';
import { ProfileHero } from './sections/ProfileHero';
import { OverviewSection } from './sections/OverviewSection';
import { BrandStudioSection } from './sections/BrandStudioSection';
import { LibrarySection } from './sections/LibrarySection';
import { MessagesSection } from './sections/MessagesSection';
import { AccountSection } from './sections/AccountSection';
import { DEFAULT_ACCENT } from './constants';

export default function ClientProfilePage() {
  const { client, loading: authLoading, logout } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const { profile, setField, loading } = useClientProfile();
  const { state: saveState, queue } = useProfileMutation();
  const { tab, setTab } = useProfileTab();
  const { messages, designs, assets, deleteDesign, optimisticAddMessage } = usePortalData(client?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!client) navigate('/client-login', { replace: true });
  }, [authLoading, client, navigate]);

  const update = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setField(field, value);
    queue(field, value);
  };

  if (authLoading || loading || !client || !profile) {
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

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        <ProfileHero
          clientId={client.id}
          username={client.username}
          packageName={client.package_name}
          profile={profile}
          accent={accent}
          saveState={saveState}
          onUpdate={update}
        />

        <div className="mt-6">
          <TabBar active={tab} onChange={setTab} accent={accent} isArabic={isArabic} />

          {tab === 'overview' && (
            <OverviewSection
              profile={profile}
              packageName={client.package_name}
              status={client.status}
              progress={client.progress}
              nextSteps={client.next_steps}
              accent={accent}
              onUpdate={update}
            />
          )}

          {tab === 'brand' && (
            <BrandStudioSection
              clientId={client.id}
              profile={profile}
              accent={accent}
              onUpdate={update}
            />
          )}

          {tab === 'library' && (
            <LibrarySection
              designs={designs}
              assets={assets}
              onDeleteDesign={deleteDesign}
              accent={accent}
            />
          )}

          {tab === 'messages' && (
            <MessagesSection
              clientId={client.id}
              messages={messages}
              onOptimisticAdd={optimisticAddMessage}
              accent={accent}
            />
          )}

          {tab === 'account' && (
            <AccountSection
              email={client.email}
              phoneNumber={client.phone_number}
              username={client.username}
              profile={profile}
              onUpdate={update}
              onSignOut={handleSignOut}
              hasSecurityQuestion={Boolean(client.security_question)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
