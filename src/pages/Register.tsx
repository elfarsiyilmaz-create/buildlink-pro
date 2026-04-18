import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const Register = () => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      toast.error(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            referral_code_used: referralCode.trim() || null,
          }, {
            onConflict: 'id'
          });
        if (profileError) console.error('Profile error:', profileError);
      }

      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pt-safe">
        <main id="main-content" className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm space-y-5"
        >
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-success" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('auth.verifyEmailTitle')}</h2>
          <p className="text-sm text-foreground/80">{t('auth.verifyEmailMessage')}</p>
          <Link to="/login" aria-label={t('auth.backToLogin')}>
            <Button variant="outline" className="w-full mt-4">{t('auth.backToLogin')}</Button>
          </Link>
        </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe">
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-foreground/80">{t('auth.registerSubtitle')}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 pb-24">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.fullName')}</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="rounded-xl h-12"
                placeholder="Jan de Vries"
                aria-label={t('auth.fullName')}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl h-12"
                placeholder="naam@email.nl"
                aria-label={t('auth.email')}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.phone')}</label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="rounded-xl h-12"
                placeholder="+31 6 12 34 56 78"
                aria-label={t('auth.phone')}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.password')}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-xl h-12 min-h-12 pr-12"
                  placeholder="••••••••"
                  aria-label={t('auth.password')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:bg-muted/90"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="rounded-xl h-12 min-h-12 pr-12"
                  placeholder="••••••••"
                  aria-label={t('auth.confirmPassword')}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:bg-muted/90"
                  aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.referralCode')}</label>
              <Input
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                className="rounded-xl h-12"
                placeholder={t('auth.referralCodePlaceholder')}
                aria-label={t('auth.referralCode')}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground',
                'shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.35)] ring-1 ring-inset ring-white/15',
                'transition-[box-shadow,opacity,transform] hover:opacity-[0.97] hover:shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.42)]',
                'active:translate-y-px active:shadow-[0_3px_12px_-2px_hsl(var(--primary)/0.3)]',
                'disabled:opacity-50 disabled:hover:shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.35)]',
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />}
              {t('auth.register')}
            </Button>

            <p className="!mt-2.5 text-center text-sm text-foreground/80">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold underline-offset-2 hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </form>

          <div className="pt-4">
            <LanguageSwitcher compact />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Register;
