import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-muted-foreground text-sm">{t('auth.loginSubtitle')}</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl h-12 border-border focus:ring-primary"
                placeholder="naam@email.nl"
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

            <Button className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
              {t('auth.login')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.register')}
              </Link>
            </p>
          </div>

          {/* Language Switcher */}
          <div className="pt-4">
            <LanguageSwitcher compact />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
