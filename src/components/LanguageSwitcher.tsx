import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  compact?: boolean;
  /** Instellingen-scherm: rode selectie, witte kaart-knoppen zoals mockup */
  variant?: 'default' | 'settings';
}

const LanguageSwitcher = ({ compact = false, variant = 'default' }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    const lang = languages.find(l => l.code === code);
    document.documentElement.dir = lang?.dir || 'ltr';
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {languages.map(lang => (
          <button
            key={lang.code}
            type="button"
            onClick={() => changeLanguage(lang.code)}
            className={`text-2xl p-1.5 rounded-lg transition-all ${
              i18n.language === lang.code
                ? 'bg-primary/10 ring-2 ring-primary scale-110'
                : 'hover:bg-muted'
            }`}
            title={lang.name}
            aria-label={lang.name}
            aria-pressed={(i18n.language || 'en').replace('_', '-').split('-')[0] === lang.code}
          >
            <span aria-hidden>{lang.flag}</span>
          </button>
        ))}
      </div>
    );
  }

  const isSelected = (code: string) =>
    (i18n.language || 'nl').replace('_', '-').split('-')[0] === code;

  return (
    <div className="grid grid-cols-2 gap-2">
      {languages.map(lang => (
        <button
          key={lang.code}
          type="button"
          onClick={() => changeLanguage(lang.code)}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
            variant === 'settings'
              ? isSelected(lang.code)
                ? 'border-transparent bg-[#DC2626] text-white shadow-sm'
                : 'border-[#E5E5EA] bg-white text-[#1C1C1E] hover:bg-[#F9F9F9]'
              : isSelected(lang.code)
                ? 'border-transparent bg-primary text-primary-foreground shadow-lg'
                : 'border-border bg-card hover:bg-muted',
          )}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="truncate">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
