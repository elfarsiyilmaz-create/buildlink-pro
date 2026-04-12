import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Logo from '@/components/Logo';

const FLAG_MAP: Record<string, string> = {
  nl: '🇳🇱', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸',
  pt: '🇵🇹', pl: '🇵🇱', ro: '🇷🇴', tr: '🇹🇷', ar: '🇸🇦', bg: '🇧🇬',
};

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'pl', label: 'Polski' },
  { code: 'ro', label: 'Română' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
  { code: 'bg', label: 'Български' },
];

const Onboarding = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'language' | 'tutorial'>('language');
  const [selectedLang, setSelectedLang] = useState(i18n.language?.substring(0, 2) || 'nl');
  const [slideIndex, setSlideIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = [
    { emoji: '👋', titleKey: 'onboarding.slide1Title', textKey: 'onboarding.slide1Text' },
    { emoji: '📝', titleKey: 'onboarding.slide2Title', textKey: 'onboarding.slide2Text' },
    { emoji: '🎁', titleKey: 'onboarding.slide3Title', textKey: 'onboarding.slide3Text' },
  ];

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
  };

  const handleContinueToTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            user_id: user.id,
            preferred_language: selectedLang 
          }, { 
            onConflict: 'user_id' 
          });
        if (error) throw error;
      }
      setStep('tutorial');
    } catch (err) {
      console.error('Error saving language preference:', err);
      setStep('tutorial');
    }
  };

  const handleComplete = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            user_id: user.id,
            onboarding_completed: true 
          }, { 
            onConflict: 'user_id' 
          });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      sessionStorage.setItem('onboarding_shown', 'true');
      toast.info(t('onboarding.profileTip'));
      navigate('/', { replace: true });
    }
  }, [navigate, t]);

  const handleSkip = () => handleComplete();

  const handleSwipe = (dir: 'left' | 'right') => {
    if (dir === 'left' && slideIndex < slides.length - 1) setSlideIndex(s => s + 1);
    if (dir === 'right' && slideIndex > 0) setSlideIndex(s => s - 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip */}
      {step === 'tutorial' && (
        <div className="absolute top-4 right-4 z-10">
          <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
            {t('onboarding.skip')}
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          {step === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <Logo size="lg" />
                <h1 className="text-xl font-bold text-foreground mt-4">{t('onboarding.selectLanguage')}</h1>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      selectedLang === lang.code
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-2xl">{FLAG_MAP[lang.code]}</span>
                    <span className="text-xs font-medium text-foreground truncate w-full text-center">{lang.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleContinueToTutorial}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                {t('onboarding.continue')}
              </button>
            </motion.div>
          )}

          {step === 'tutorial' && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-8"
              onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
              onTouchEnd={(e) => {
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
                  <div className="text-7xl">{slides[slideIndex].emoji}</div>
                  <h2 className="text-xl font-bold text-foreground">{t(slides[slideIndex].titleKey)}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(slides[slideIndex].textKey)}</p>
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              <div className="flex justify-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === slideIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              {/* Action button */}
              {slideIndex === slides.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  {t('onboarding.getStarted')}
                </button>
              ) : (
                <button
                  onClick={() => setSlideIndex(s => s + 1)}
                  className="w-full py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
                >
                  {t('onboarding.continue')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
