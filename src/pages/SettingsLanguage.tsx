import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

const cardClass =
  'rounded-[18px] border border-black/[0.035] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]';

/**
 * Volledige taalkeuze — los van hoofd-instellingen voor rustiger UX (native-achtig).
 */
const SettingsLanguage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
          {t('settings.language')}
        </h1>

        <div className="mt-5">
          <section className={cn(cardClass, 'p-4')}>
            <LanguageSwitcher variant="settings" />
          </section>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsLanguage;
