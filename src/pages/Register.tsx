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
import { Loader2, Mail, CheckCircle } from 'lucide-react';

const Register = () => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
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
      const [firstName, ...lastParts] = fullName.trim().split(' ');
      const lastName = lastParts.join(' ');

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            first_name: firstName,
            last_name: lastName,
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
            first_name: firstName,
            last_name: lastName || null,
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm space-y-5"
        >
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t('auth.verifyEmailTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('auth.verifyEmailMessage')}</p>
          <Link to="/login">
            <Button variant="outline" className="w-full mt-4">{t('auth.backToLogin')}</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-muted-foreground text-sm">{t('auth.registerSubtitle')}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.fullName')}</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="rounded-xl h-12"
                placeholder="Jan de Vries"
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
                placeholder="+31 6 1234 5678"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.password')}</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-xl h-12"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.confirmPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="rounded-xl h-12"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.referralCode')}</label>
              <Input
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                className="rounded-xl h-12"
                placeholder="ALHAN-XXXX"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('auth.register')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </form>

          <div className="pt-4">
            <LanguageSwitcher compact />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
