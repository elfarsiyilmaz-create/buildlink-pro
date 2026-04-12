import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n/config';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher = ({ compact = false }: LanguageSwitcherProps) => {
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
            aria-pressed={(i18n.language || 'nl').replace('_', '-').split('-')[0] === lang.code}
          >
            <span aria-hidden>{lang.flag}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            i18n.language === lang.code
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-card hover:bg-muted border border-border'
          }`}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="truncate">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
