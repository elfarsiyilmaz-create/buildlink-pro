import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

      // AuthGuard will handle status checks — just navigate
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
            <p className="text-muted-foreground text-sm">{t('auth.loginSubtitle')}</p>
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
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  {t('auth.rememberMe')}
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('auth.login')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.register')}
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

export default Login;
