import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary, LoadingFallback } from "@/components/shared";
import FloatingBrandButton from "@/components/shared/FloatingBrandButton";
import LeadCapturePopup from "@/features/lead-capture";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import GlobalLanguageToggle from "@/components/shared/GlobalLanguageToggle";

// Lazy load pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const MobileDemoPage = lazy(() => import("./pages/MobileDemoPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Create QueryClient outside component to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <AuthProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/demo" element={<MobileDemoPage />} />
                    <Route path="/services/:slug" element={<ServicePage />} />
                    <Route path="/lumos-admin" element={<AdminDashboard />} />

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <FloatingBrandButton />
                <GlobalLanguageToggle />
                <LeadCapturePopup />
              </BrowserRouter>
            </AuthProvider>
          </LanguageProvider>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;