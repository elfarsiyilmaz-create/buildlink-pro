import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const diff = Date.now() - Number(raw);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // Show after small delay
    const timer = setTimeout(() => setVisible(true), 2000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {!showInstructions ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">📲</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-sm">{t('pwa.title')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('pwa.description')}</p>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('pwa.notNow')}
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  {t('pwa.install')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">{t('pwa.howToInstall')}</h3>
                <button onClick={() => setShowInstructions(false)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {isIOS() ? (
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">1.</span> {t('pwa.iosStep1')}</li>
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">2.</span> {t('pwa.iosStep2')}</li>
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">3.</span> {t('pwa.iosStep3')}</li>
                </ol>
              ) : (
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">1.</span> {t('pwa.androidStep1')}</li>
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">2.</span> {t('pwa.androidStep2')}</li>
                  <li className="flex items-start gap-2"><span className="font-bold text-foreground">3.</span> {t('pwa.androidStep3')}</li>
                </ol>
              )}
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('pwa.gotIt')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
