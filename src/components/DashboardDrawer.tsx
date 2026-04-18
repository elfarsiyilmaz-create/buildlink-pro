import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type DashboardDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const primaryLinks: { path: string; label: string }[] = [
  { path: '/', label: 'Dashboard' },
  { path: '/hours', label: 'Uren' },
  { path: '/safety', label: 'Veilig werken' },
  { path: '/rewards', label: 'Maandtrekking' },
  { path: '/profile', label: 'Profiel' },
];

const itemClass =
  'flex h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[15px] leading-[20px] text-[#1C1C1E] transition-colors hover:bg-[#F2F2F7] active:bg-[#F2F2F7]';

/**
 * Secundair zijmenu voor het dashboard (Home).
 */
export function DashboardDrawer({ open, onClose }: DashboardDrawerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] m-0 cursor-default border-0 bg-black/30 p-0 backdrop-blur-[1px]"
            aria-label={t('common.closeMenu')}
            onClick={onClose}
          />
          <motion.aside
            id="dashboard-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 z-[101] flex h-dvh w-[280px] max-w-[80vw] flex-col bg-white px-5 py-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[18px] font-semibold leading-[24px] text-[#1C1C1E]">Menu</p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#8E8E93] transition-colors hover:bg-[#F2F2F7]"
                aria-label={t('common.closeMenu')}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Dashboard navigatie">
              {primaryLinks.map(link => (
                <button key={link.path} type="button" className={itemClass} onClick={() => go(link.path)}>
                  {link.label}
                </button>
              ))}

              <div className="my-4 border-t border-[#E5E5EA]" role="separator" />

              <button type="button" className={itemClass} onClick={() => go('/settings')}>
                <Settings className="h-5 w-5 shrink-0 text-[#636366]" aria-hidden />
                {t('nav.settings')}
              </button>
              <button
                type="button"
                className={cn(itemClass, 'text-[#DC2626] hover:bg-[#FEF2F2] active:bg-[#FEE2E2]')}
                onClick={() => void logout()}
              >
                <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                {t('auth.logout')}
              </button>
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
