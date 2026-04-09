import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if we already have a session with recovery type
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t('auth.passwordUpdated'));
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
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
            <h1 className="text-xl font-bold text-foreground mb-1">{t('auth.newPassword')}</h1>
            <p className="text-muted-foreground text-sm">{t('auth.newPasswordSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.newPassword')}</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-xl h-12 border-border focus:ring-primary"
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
                className="rounded-xl h-12 border-border focus:ring-primary"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !ready}
              className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('auth.updatePassword')}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
