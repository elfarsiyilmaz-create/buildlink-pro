import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldX, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { fetchUserIsAdmin } from '@/hooks/useUserRole';

interface AuthGuardProps {
  children: React.ReactNode;
}

function isProfileCompleteForGate(fullName: string | null | undefined, phone: string | null | undefined, kvk: string | null | undefined): boolean {
  return !!(fullName?.trim() && phone?.trim() && kvk?.trim());
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'approved' | 'rejected' | 'unverified' | 'onboarding' | 'none'>('none');
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

      const [{ data: profile }, { count: availabilityCount }, isAdmin] = await Promise.all([
        supabase
          .from('profiles')
          .select('status, onboarding_completed, full_name, phone, kvk_number')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        fetchUserIsAdmin(user.id),
      ]);

      const profileStatus = (profile?.status as string) || 'pending';

      if (profileStatus === 'rejected') {
        setStatus('rejected');
      } else {
        // No admin-approval gate: pending and other non-rejected statuses get full app access
        const onboardingShownThisSession = sessionStorage.getItem('onboarding_shown');
        if (!onboardingShownThisSession && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
          setStatus('onboarding');
        } else {
          setStatus('approved');
          const onboardingDone = !!profile?.onboarding_completed;
          const baseProfileComplete = isProfileCompleteForGate(profile?.full_name, profile?.phone, profile?.kvk_number);
          const availabilityComplete = (availabilityCount || 0) > 0;
          const verificationComplete = profileStatus === 'approved';
          const profileComplete = baseProfileComplete && availabilityComplete && verificationComplete;
          const gateRequired = onboardingDone && !profileComplete && !isAdmin;

          if (gateRequired) {
            const canStayOnPath =
              location.pathname === '/profile-gate' ||
              location.pathname === '/profile' ||
              location.pathname === '/onboarding';
            if (!canStayOnPath) {
              navigate('/profile-gate', { replace: true });
            }
          } else if (location.pathname === '/profile-gate') {
            navigate('/', { replace: true });
          }
        }
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
