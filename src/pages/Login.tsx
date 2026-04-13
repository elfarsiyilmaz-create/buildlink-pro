import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        toast.error(t('auth.emailNotConfirmed'));
      } else if (err.message?.includes('Invalid login credentials')) {
        toast.error(t('auth.invalidCredentials'));
      } else {
        toast.error(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const nativeRedirect = 'buildlinkpro://login-callback';
      const redirectTo = Capacitor.isNativePlatform()
        ? nativeRedirect
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Capacitor.isNativePlatform(),
        },
      });

      if (error) {
        toast.error(error.message || t('common.error'));
        return;
      }

      if (Capacitor.isNativePlatform() && data?.url) {
        await Browser.open({ url: data.url });
        return;
      }
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe">
      {/*
        Taalvlaggen zitten in een vaste footer met pb-safe (STAP 3).
        De AI-chat FAB op /login wordt in AlhanChat hoger gezet zodat hij boven deze footer staat (min. 44×44px).
      */}
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-6 py-10 min-h-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-foreground/70">{t('auth.loginSubtitle')}</p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium gap-3"
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
              aria-label={t('auth.continueWithGoogle')}
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {t('auth.continueWithGoogle')}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium gap-3"
              onClick={() => handleSocialLogin('apple')}
              disabled={!!socialLoading}
              aria-label={t('auth.continueWithApple')}
            >
              {socialLoading === 'apple' ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              {t('auth.continueWithApple')}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-foreground/70">{t('auth.orContinueWith')}</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl h-12 border-border focus:ring-primary"
                placeholder="naam@email.nl"
                aria-label={t('auth.email')}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.password')}</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-xl h-12 border-border focus:ring-primary"
                placeholder="••••••••"
                aria-label={t('auth.password')}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-foreground/80 cursor-pointer">
                  {t('auth.rememberMe')}
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary font-medium underline-offset-2 hover:underline" aria-label={t('auth.forgotPassword')}>
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />}
              {t('auth.login')}
            </Button>

            <p className="text-center text-sm text-foreground/80">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold underline-offset-2 hover:underline">
                {t('auth.register')}
              </Link>
            </p>
          </form>
        </motion.div>
      </main>
      <footer className="shrink-0 w-full border-t border-border/60 bg-background/95 px-6 pt-3 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="max-w-sm mx-auto w-full flex justify-center">
          <LanguageSwitcher compact />
        </div>
      </footer>
    </div>
  );
};

export default Login;
