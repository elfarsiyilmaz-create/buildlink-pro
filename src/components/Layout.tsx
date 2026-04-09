import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Home, User, Briefcase, Users, Settings, LogOut, Menu, X, Shield } from 'lucide-react';
import Logo from './Logo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null; specialization: string | null } | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, specialization')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, [location.pathname]); // refresh when navigating back

  const initials = `${(profile?.first_name || '')[0] || ''}${(profile?.last_name || '')[0] || ''}`.toUpperCase();
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || "ZZP'er";

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
    { icon: Briefcase, label: t('nav.work'), path: '/work' },
    { icon: Users, label: t('nav.network'), path: '/network' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
    ...(isAdmin ? [{ icon: Shield, label: t('nav.admin'), path: '/admin' }] : []),
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <Logo size="sm" />
          <Avatar className="w-9 h-9">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Profile" /> : null}
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {initials || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border shadow-2xl flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-border flex items-center justify-between">
                <Logo size="sm" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11">
                    {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Profile" /> : null}
                    <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                      {initials || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{profile?.specialization || 'ZZP\'er'}</p>
                  </div>
                </div>
              </div>

              {/* Nav Items */}
              <nav className="flex-1 p-3 space-y-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="p-3 border-t border-border">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/login', { replace: true });
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  {t('auth.logout')}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-14 pb-6 px-4 max-w-lg mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
