import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sun, Lock, Mail, Phone, LogOut, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DELETE_CONFIRM_WORD = 'VERWIJDEREN';

const Settings = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'warn' | 'confirm'>('warn');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const resetDeleteDialog = () => {
    setDeleteStep('warn');
    setDeletePhrase('');
    setDeleteSubmitting(false);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) resetDeleteDialog();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('auth.logoutSuccess'));
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    setDeleteSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error(t('settings.deleteFailed'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        toast.error(t('settings.deleteFailed'));
        return;
      }
      if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
        toast.error(t('settings.deleteFailed'));
        return;
      }

      toast.success(t('settings.deleteSuccess'));
      await supabase.auth.signOut();
      setDeleteDialogOpen(false);
      resetDeleteDialog();
      navigate('/login', { replace: true });
    } catch {
      toast.error(t('settings.deleteFailed'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5 pb-24"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>

      {/* Language */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-foreground">{t('settings.language')}</h2>
        <LanguageSwitcher />
      </div>

      {/* Dark Mode */}
      <div className="glass-card rounded-2xl p-5">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between"
          aria-label={t('settings.darkMode')}
          aria-pressed={theme === 'dark'}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-primary" aria-hidden />
            ) : (
              <Sun className="w-5 h-5 text-primary" aria-hidden />
            )}
            <span className="font-medium text-foreground">{t('settings.darkMode')}</span>
          </div>
          <div className={`w-12 h-7 rounded-full relative transition-colors ${
            theme === 'dark' ? 'bg-primary' : 'bg-muted'
          }`}>
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="glass-card rounded-2xl divide-y divide-border">
        <button type="button" className="w-full flex items-center gap-3 px-5 py-4 text-foreground hover:bg-muted/50 transition-colors" aria-label={t('settings.changePassword')}>
          <Lock className="w-5 h-5 text-foreground/75" aria-hidden />
          <span className="font-medium text-sm">{t('settings.changePassword')}</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-destructive hover:bg-destructive/5 transition-colors"
          aria-label={t('auth.logout')}
        >
          <LogOut className="w-5 h-5" aria-hidden />
          <span className="font-medium text-sm">{t('auth.logout')}</span>
        </button>
      </div>

      {/* App Info */}
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <p className="text-xs text-foreground/80">{t('settings.version')}: 1.0.0</p>
        <p className="text-xs text-foreground/80">{t('settings.contact')}:</p>
        <div className="flex items-center gap-2 text-xs text-foreground/80">
          <Mail className="w-3.5 h-3.5" aria-hidden />
          info@alhangroep.nl
        </div>
        <div className="flex items-center gap-2 text-xs text-foreground/80">
          <Phone className="w-3.5 h-3.5" aria-hidden />
          +31 6 21 95 00 66
        </div>
      </div>

      <a
        href="https://elfarsiyilmaz-create.github.io/buildlink-pro/privacy-policy.html"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-card rounded-2xl flex items-center gap-3 px-5 py-4 text-primary hover:bg-muted/40 transition-colors font-medium text-sm"
        aria-label="Privacybeleid lezen (opent in nieuw tabblad)"
      >
        <FileText className="w-5 h-5 shrink-0" aria-hidden />
        Privacybeleid lezen
      </a>

      <Button
        type="button"
        variant="destructive"
        className="w-full h-12 rounded-xl text-base font-semibold"
        onClick={() => {
          resetDeleteDialog();
          setDeleteStep('warn');
          setDeleteDialogOpen(true);
        }}
      >
        {t('settings.deleteMyAccount')}
      </Button>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent className="max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
          {deleteStep === 'warn' ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.deleteConfirmTitle')}</DialogTitle>
                <DialogDescription className="text-left whitespace-pre-line">
                  {t('settings.deleteConfirmMessage')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => handleDeleteDialogOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteStep('confirm')}>
                  {t('common.next')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('settings.deleteConfirmTitle')}</DialogTitle>
                <DialogDescription className="text-left">{t('settings.deleteTypeToConfirm')}</DialogDescription>
              </DialogHeader>
              <Input
                value={deletePhrase}
                onChange={e => setDeletePhrase(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={DELETE_CONFIRM_WORD}
                className="rounded-xl h-11"
                aria-label={t('settings.deleteTypeToConfirm')}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeletePhrase('');
                    setDeleteStep('warn');
                  }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePhrase !== DELETE_CONFIRM_WORD || deleteSubmitting}
                  onClick={handleDeleteAccount}
                >
                  {deleteSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.confirm')
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Settings;
