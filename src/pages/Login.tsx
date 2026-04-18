import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { languages } from '@/i18n/config';
import { cn } from '@/lib/utils';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  const resolvedCode = (i18n.resolvedLanguage || i18n.language || 'nl').split('-')[0];
  const currentLanguage =
    languages.find(l => l.code === resolvedCode) ?? languages[0];

  const applyLanguage = (code: string) => {
    i18n.changeLanguage(code);
    const lang = languages.find(l => l.code === code);
    document.documentElement.dir = lang?.dir || 'ltr';
  };

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

  const inputClassName =
    'h-12 rounded-xl border-[#C7C7CC] bg-white px-4 text-[17px] placeholder:text-[#AEAEB2] focus-visible:ring-[#D1D1D6]';

  return (
    <div className="min-h-dvh bg-[#f3f3f5] pt-safe">
      {/*
        Taalkeuze via bottom sheet onder de card. De AI-chat FAB op /login wordt in AlhanChat hoger gezet indien nodig.
      */}
      <main id="main-content" className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-5">
        <div className="w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <h1 className="mb-5 mt-6 text-[56px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#1C1C1E]">
            Alhan Groep
          </h1>

          <div className="w-full rounded-[24px] border border-black/[0.035] bg-white px-5 py-5 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4">
              <Button
                type="button"
                variant="outline"
                className="relative h-14 w-full gap-0 rounded-xl border-[#C7C7CC] bg-white px-4 text-base font-medium text-[#1C1C1E] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#FAFAFA]"
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading}
                aria-label={t('auth.continueWithGoogle')}
              >
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 [&_svg]:size-5">
                  {socialLoading === 'google' ? (
                    <Loader2 className="animate-spin text-foreground" aria-hidden />
                  ) : (
                    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex w-full justify-center pr-2 text-[17px]">{t('auth.continueWithGoogle')}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="relative h-14 w-full gap-0 rounded-xl border-[#C7C7CC] bg-white px-4 text-base font-medium text-[#1C1C1E] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#FAFAFA]"
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading}
                aria-label={t('auth.continueWithApple')}
              >
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 [&_svg]:size-5">
                  {socialLoading === 'apple' ? (
                    <Loader2 className="animate-spin text-foreground" aria-hidden />
                  ) : (
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                </span>
                <span className="flex w-full justify-center pr-2 text-[17px]">{t('auth.continueWithApple')}</span>
              </Button>
            </div>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#D1D1D6]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[16px] text-[#6E6E73]">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[17px] font-semibold text-[#1C1C1E]" htmlFor="login-email">
                    {t('auth.email')}
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClassName}
                    placeholder="naam@email.nl"
                    aria-label={t('auth.email')}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[17px] font-semibold text-[#1C1C1E]" htmlFor="login-password">
                    {t('auth.password')}
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClassName}
                    placeholder="••••••••"
                    aria-label={t('auth.password')}
                    required
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Checkbox
                    id="remember"
                    className="h-6 w-6 rounded-full border-[#B91C1C] data-[state=checked]:border-[#B91C1C] data-[state=checked]:bg-[#B91C1C]"
                  />
                  <label htmlFor="remember" className="cursor-pointer text-[17px] text-[#1C1C1E]">
                    {t('auth.rememberMe')}
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="shrink-0 text-[17px] text-[#6E6E73] underline-offset-2 hover:underline"
                  aria-label={t('auth.forgotPassword')}
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-6 h-14 w-full rounded-full bg-[#C61E1E] text-[17px] font-semibold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] hover:bg-[#B91C1C] focus-visible:ring-2 focus-visible:ring-[#C61E1E]/35 focus-visible:ring-offset-2"
              >
                {loading && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
                {t('auth.login')}
              </Button>

              <p className="mt-5 text-center text-[17px] text-[#6E6E73]">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#B91C1C] underline-offset-2 hover:underline"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </form>
          </div>

          <button
            type="button"
            className="mt-8 flex w-full items-center justify-center gap-1 text-[17px] text-[#6E6E73]"
            onClick={() => setLangSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={langSheetOpen}
          >
            <span>
              {t('settings.language')}: {currentLanguage.name}
            </span>
            <span aria-hidden className="text-neutral-400">
              ›
            </span>
          </button>

          <Sheet open={langSheetOpen} onOpenChange={setLangSheetOpen}>
            <SheetContent
              side="bottom"
              className="rounded-t-3xl border-t border-neutral-200 bg-white pb-safe pt-6"
            >
              <SheetHeader className="mb-4 space-y-0 text-center sm:text-center">
                <SheetTitle className="text-base font-medium">{t('settings.language')}</SheetTitle>
              </SheetHeader>
              <div className="flex max-h-[min(50vh,320px)] flex-col gap-1 overflow-y-auto pb-2">
                {languages.map(lang => {
                  const active = lang.code === resolvedCode;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className={cn(
                        'w-full rounded-2xl px-4 py-3.5 text-left text-base font-medium transition-colors',
                        active
                          ? 'bg-neutral-100 text-foreground'
                          : 'text-foreground hover:bg-neutral-50',
                      )}
                      onClick={() => {
                        applyLanguage(lang.code);
                        setLangSheetOpen(false);
                      }}
                    >
                      {lang.name}
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
};

export default Login;
