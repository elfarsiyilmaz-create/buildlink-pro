import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Onboarding = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = [
    { emoji: '👋', titleKey: 'onboarding.slide1Title', textKey: 'onboarding.slide1Text' },
    { emoji: '📝', titleKey: 'onboarding.slide2Title', textKey: 'onboarding.slide2Text' },
    { emoji: '🎁', titleKey: 'onboarding.slide3Title', textKey: 'onboarding.slide3Text' },
    { emoji: '🏆', titleKey: 'onboarding.slide4Title', textKey: 'onboarding.slide4Text' },
  ];

  const handleComplete = useCallback(async () => {
    const resolvedCode = (i18n.resolvedLanguage || i18n.language || 'nl').split('-')[0];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              onboarding_completed: true,
              preferred_language: resolvedCode,
            },
            {
              onConflict: 'user_id',
            },
          );
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      sessionStorage.setItem('onboarding_shown', 'true');
      toast.info(t('onboarding.profileTip'));
      navigate('/', { replace: true });
    }
  }, [navigate, t, i18n.resolvedLanguage, i18n.language]);

  const handleSwipe = (dir: 'left' | 'right') => {
    if (dir === 'left' && slideIndex < slides.length - 1) setSlideIndex(s => s + 1);
    if (dir === 'right' && slideIndex > 0) setSlideIndex(s => s - 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key="tutorial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm space-y-8"
            onTouchStart={e => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={e => {
              if (touchStart === null) return;
              const diff = touchStart - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) handleSwipe(diff > 0 ? 'left' : 'right');
              setTouchStart(null);
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.25 }}
                className="text-center space-y-4"
              >
                <h2 className="text-xl font-bold text-foreground">{t(slides[slideIndex].titleKey)}</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">{t(slides[slideIndex].textKey)}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === slideIndex ? 'bg-primary w-6' : 'bg-foreground/25'
                  }`}
                  aria-label={`${i + 1} / ${slides.length}`}
                />
              ))}
            </div>

            {slideIndex === slides.length - 1 ? (
              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                {t('onboarding.getStarted')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSlideIndex(s => s + 1)}
                className="w-full py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
              >
                {t('onboarding.continue')}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding;
