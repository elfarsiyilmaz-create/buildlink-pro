import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Register = () => {
  const { t } = useTranslation();

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

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.fullName')}</label>
              <Input className="rounded-xl h-12" placeholder="Jan de Vries" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.email')}</label>
              <Input type="email" className="rounded-xl h-12" placeholder="naam@email.nl" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.phone')}</label>
              <Input type="tel" className="rounded-xl h-12" placeholder="+31 6 1234 5678" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.password')}</label>
              <Input type="password" className="rounded-xl h-12" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.confirmPassword')}</label>
              <Input type="password" className="rounded-xl h-12" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('auth.referralCode')}</label>
              <Input className="rounded-xl h-12" placeholder="ALHAN-XXXX" />
            </div>

            <Button className="w-full h-12 rounded-xl text-base font-semibold gradient-primary text-primary-foreground hover:opacity-90 transition-opacity">
              {t('auth.register')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </div>

          <div className="pt-4">
            <LanguageSwitcher compact />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
