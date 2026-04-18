import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Lock,
  Mail,
  Phone,
  LogOut,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/BottomNav';

const DELETE_CONFIRM_WORD = 'VERWIJDEREN';

const cardClass =
  'rounded-[18px] border border-black/[0.035] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]';

const Settings = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
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
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div
        className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] pt-5"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-[#B91C1C]"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t('common.back')}
        </button>

        <p className="text-[13px] font-medium leading-[18px] text-[#8E8E93]">Alhan Groep</p>
        <h1 className="mt-0.5 text-[22px] font-semibold leading-[28px] tracking-[-0.02em] text-[#1C1C1E]">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-[14px] leading-[20px] text-[#636366]">{t('settings.subtitle')}</p>

        <div className="mt-5 flex flex-col gap-3">
          <section className={cn(cardClass, 'p-4')}>
            <h2 className="mb-3 text-[16px] font-semibold leading-[22px] text-[#1C1C1E]">{t('settings.language')}</h2>
            <LanguageSwitcher variant="settings" />
          </section>

          <section className={cn(cardClass, 'flex items-center justify-between p-4')}>
            <div className="flex min-w-0 items-center gap-3">
              <Sun className="h-5 w-5 shrink-0 text-[#1C1C1E]" aria-hidden />
              <span className="text-[15px] font-medium text-[#1C1C1E]">{t('settings.darkMode')}</span>
            </div>
            <div className="shrink-0">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
                aria-label={t('settings.darkMode')}
                className="data-[state=checked]:bg-[#1C1C1E] data-[state=unchecked]:bg-[#E5E5EA]"
              />
            </div>
          </section>

          <section className={cn(cardClass, 'divide-y divide-[#E5E5EA] overflow-hidden')}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-[#F9F9F9] active:bg-[#F2F2F7]"
              aria-label={t('settings.changePassword')}
            >
              <Lock className="h-5 w-5 shrink-0 text-[#636366]" aria-hidden />
              <span className="min-w-0 flex-1 text-[15px] font-medium text-[#1C1C1E]">{t('settings.changePassword')}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-red-50/60 active:bg-red-50"
              aria-label={t('auth.logout')}
            >
              <LogOut className="h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden />
              <span className="min-w-0 flex-1 text-[15px] font-medium text-[#DC2626]">{t('auth.logout')}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
            </button>
          </section>

          <section className={cn(cardClass, 'flex gap-4 p-4')}>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-[16px] text-[#8E8E93]">
                {t('settings.version')} 1.0.0
              </p>
            </div>
            <div className="min-w-0 flex-[1.35] space-y-2 border-l border-[#E5E5EA] pl-4">
              <p className="text-[13px] font-semibold text-[#1C1C1E]">{t('settings.contact')}</p>
              <a
                href="mailto:info@alhangroep.nl"
                className="flex items-center gap-2 text-[12px] leading-[16px] text-[#636366] transition-colors hover:text-[#1C1C1E]"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#8E8E93]" aria-hidden />
                info@alhangroep.nl
              </a>
              <a
                href="tel:+31621950066"
                className="flex items-center gap-2 text-[12px] leading-[16px] text-[#636366] transition-colors hover:text-[#1C1C1E]"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#8E8E93]" aria-hidden />
                +31 6 21 95 00 66
              </a>
            </div>
          </section>

          <a
            href="https://elfarsiyilmaz-create.github.io/buildlink-pro/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              cardClass,
              'flex items-center gap-3 p-4 transition-colors hover:bg-[#FAFAFA] active:bg-[#F5F5F5]',
            )}
            aria-label={t('settings.readPrivacy')}
          >
            <FileText className="h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden />
            <span className="min-w-0 flex-1 text-[15px] font-medium text-[#DC2626]">{t('settings.readPrivacy')}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#DC2626]/50" aria-hidden />
          </a>

          <Button
            type="button"
            className="h-12 w-full rounded-[14px] bg-[#DC2626] text-[15px] font-semibold text-white shadow-none hover:bg-[#B91C1C]"
            onClick={() => {
              resetDeleteDialog();
              setDeleteStep('warn');
              setDeleteDialogOpen(true);
            }}
          >
            {t('settings.deleteMyAccount')}
          </Button>
        </div>
      </div>

      <BottomNav />

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
                className="h-11 rounded-xl"
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
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
    </div>
  );
};

export default Settings;
