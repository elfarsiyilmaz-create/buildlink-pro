import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import Work from "@/pages/Work";
import Network from "@/pages/Network";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AdminDashboard from "@/pages/AdminDashboard";
import Onboarding from "@/pages/Onboarding";
import Leaderboard from "@/pages/Leaderboard";
import TimeRegistration from "@/pages/TimeRegistration";
import WheelOfFortunePage from "@/pages/WheelOfFortunePage";
import NotFound from "@/pages/NotFound";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AlhanChat from "@/components/AlhanChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                <Layout />
              </AuthGuard>
            }>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/work" element={<Work />} />
              <Route path="/network" element={<Network />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/hours" element={<TimeRegistration />} />
              <Route path="/wheel" element={<WheelOfFortunePage />} />
              <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <PWAInstallPrompt />
          <AlhanChat />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
