import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, ShieldX, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'approved' | 'pending' | 'rejected' | 'unverified' | 'onboarding' | 'none'>('none');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      // Check if email is confirmed
      const user = session.user;
      if (!user.email_confirmed_at) {
        setStatus('unverified');
        setLoading(false);
        return;
      }

      // Check profile status
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, onboarding_completed')
        .eq('user_id', user.id)
        .single();

      const profileStatus = (profile?.status as string) || 'pending';

      if (profileStatus === 'approved') {
        // Demo mode: show onboarding once per session
        const onboardingShownThisSession = sessionStorage.getItem('onboarding_shown');
        if (!onboardingShownThisSession && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
          setStatus('onboarding');
        } else {
          setStatus('approved');
        }
      } else if (profileStatus === 'rejected') {
        setStatus('rejected');
      } else {
        setStatus('pending');
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('onboarding_shown');
        navigate('/login', { replace: true });
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'unverified') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('auth.verifyEmailTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('auth.verifyEmailMessage')}</p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            {t('auth.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('auth.pendingTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('auth.pendingMessage')}</p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('auth.rejectedTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('auth.rejectedMessage')}</p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'onboarding') return <>{children}</>;

  return <>{children}</>;
};

export default AuthGuard;
