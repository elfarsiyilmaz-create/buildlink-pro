import { lazy, Suspense, useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import Login from "@/pages/Login";

const Home = lazy(() => import("@/pages/Home"));
const Profile = lazy(() => import("@/pages/Profile"));
const Work = lazy(() => import("@/pages/Work"));
const Network = lazy(() => import("@/pages/Network"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const AlhanChat = lazy(() => import("@/components/AlhanChat"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt"));
const Layout = lazy(() => import("@/components/Layout"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const TimeRegistration = lazy(() => import("@/pages/TimeRegistration"));
const WheelOfFortunePage = lazy(() => import("@/pages/WheelOfFortunePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PUBLIC_AUTH_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

const DeferredGlobalChrome = () => {
  const { pathname } = useLocation();
  if (PUBLIC_AUTH_PATHS.has(pathname)) return null;
  return (
    <Suspense fallback={null}>
      <PWAInstallPrompt />
      <AlhanChat />
    </Suspense>
  );
};

const routeFallback = (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const NativeOAuthDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const registration = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      console.log("[OAuth deeplink] appUrlOpen raw url:", url);

      if (!url.includes("login-callback")) return;

      try {
        const parsed = new URL(url);
        const searchParams = parsed.searchParams;
        const search = parsed.search;

        console.log("[OAuth deeplink] pathname:", parsed.pathname);
        console.log("[OAuth deeplink] full search (query string):", search);
        console.log(
          "[OAuth deeplink] parsed entries:",
          Object.fromEntries(searchParams.entries()),
        );

        const code = searchParams.get("code");
        if (!code) {
          console.warn("[OAuth deeplink] missing ?code= in URL");
          toast.error("OAuth callback mist authorization code");
          return;
        }

        // Supabase PKCE: exchangeCodeForSession expects the raw `code` value from the
        // redirect URL (same as params.code in web PKCE flow), not the literal "?code=…" string.
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("[OAuth deeplink] exchangeCodeForSession error:", error);
          toast.error(error.message);
          return;
        }

        console.log("[OAuth deeplink] session ok:", !!data?.session, "user:", !!data?.user);

        await Browser.close();
        navigate("/", { replace: true });
      } catch (e: unknown) {
        console.error("[OAuth deeplink] exception:", e);
        const message = e instanceof Error ? e.message : String(e);
        toast.error(message);
      }
    });

    return () => {
      void registration.then(h => h.remove());
    };
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeOAuthDeepLinkHandler />
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={
                <AuthGuard>
                  <Onboarding />
                </AuthGuard>
              } />
              <Route element={
                <AuthGuard>
                  <Suspense fallback={routeFallback}>
                    <Layout />
                  </Suspense>
                </AuthGuard>
              }>
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/work" element={<Work />} />
                <Route path="/network" element={<Network />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/hours" element={<TimeRegistration />} />
                <Route path="/time-registration" element={<Navigate to="/hours" replace />} />
                <Route path="/wheel" element={<WheelOfFortunePage />} />
                <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <DeferredGlobalChrome />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
