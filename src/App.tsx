import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary, LoadingFallback } from "@/components/shared";
import FloatingBrandButton from "@/components/shared/FloatingBrandButton";

import { AuthProvider } from "@/context/AuthContext";
import { AppearanceProvider } from "@/context/AppearanceContext";
import { LanguageProvider } from "@/context/LanguageContext";
import GlobalLanguageToggle from "@/components/shared/GlobalLanguageToggle";
import { ProtectedRoute, GuestRoute, AdminRoute } from "@/components/shared/AuthRoutes";
import { authConfig } from "@/config/auth";

// /profile-preview shows a fully-mocked client portal. We expose it only when
// VITE_ENABLE_PROFILE_PREVIEW=true so production users can't mistake mock
// data for real account data, or use it for social engineering.
const PROFILE_PREVIEW_ENABLED = authConfig.isDev || authConfig.enableProfilePreview;

const Index = lazy(() => import("./pages/Index"));
const MobileDemoPage = lazy(() => import("./pages/MobileDemoPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const TrackRequestPage = lazy(() => import("./pages/TrackRequestPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const LogInPage = lazy(() => import("./pages/LogInPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const InviteOnboardingPage = lazy(() => import("./pages/InviteOnboardingPage"));

const ClientProfilePage = lazy(() => import("./features/client-profile/ClientProfilePage"));
const ClientProfileTestView = lazy(() => import("./features/client-profile/ClientProfileTestView"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <AppearanceProvider>
              <AuthProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/demo" element={<MobileDemoPage />} />
                    <Route path="/services/:slug" element={<ServicePage />} />
                    <Route path="/track-request" element={<TrackRequestPage />} />
                    <Route path="/client-signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />
                    <Route path="/client-login" element={<GuestRoute><LogInPage /></GuestRoute>} />
                    <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
                    <Route path="/invite-onboarding" element={<InviteOnboardingPage />} />
                    <Route path="/lumos-admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                    <Route path="/profile" element={<ProtectedRoute><ClientProfilePage /></ProtectedRoute>} />
                    {PROFILE_PREVIEW_ENABLED && (
                      <Route path="/profile-preview" element={<ClientProfileTestView />} />
                    )}

                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsConditions />} />
                    <Route path="/cookie-policy" element={<CookiePolicy />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <FloatingBrandButton />
                <GlobalLanguageToggle />
                
              </BrowserRouter>
              </AuthProvider>
            </AppearanceProvider>
          </LanguageProvider>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
