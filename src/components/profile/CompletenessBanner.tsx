import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { MissingField } from '@/hooks/useProfileCompleteness';

interface CompletenessBannerProps {
  percentage: number;
  missingFields: MissingField[];
  color: string;
  onOpenWizard: (step?: number) => void;
}

const DISMISS_KEY = 'profile_banner_dismissed_at';

const CompletenessBanner = ({ percentage, missingFields, color, onOpenWizard }: CompletenessBannerProps) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const hours = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hours < 24) setDismissed(true);
    }
  }, []);

  if (percentage >= 100 || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card rounded-2xl p-4 space-y-3 relative"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-foreground/70 hover:text-foreground"
          aria-label={t('common.closeMenu')}
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground text-sm">
            {t('profile.complete_your_profile')}
          </h3>
        </div>

        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-foreground/80">
          {100 - percentage} {t('profile.points_remaining')}
        </p>

        <div className="space-y-1.5">
          {missingFields.slice(0, 4).map((field) => (
            <button
              key={field.key}
              type="button"
              onClick={() => onOpenWizard(field.wizardStep)}
              className="flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-accent transition-colors"
              aria-label={t(field.labelKey)}
            >
              <span className="flex items-center gap-2">
                <span className="text-destructive" aria-hidden>❌</span>
                <span className="text-foreground">{t(field.labelKey)}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-foreground/70" aria-hidden />
            </button>
          ))}
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => onOpenWizard(0)}
        >
          {t('profile.wizard_title')}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompletenessBanner;
