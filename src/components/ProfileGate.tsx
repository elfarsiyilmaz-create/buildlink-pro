import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ProfileGate = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white px-6 pt-safe pb-10 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('profileGate.title')}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{t('profileGate.subtitle')}</p>
        </div>

        <ul className="space-y-4 text-left text-base text-foreground">
          <li>{t('profileGate.benefit1')}</li>
          <li>{t('profileGate.benefit2')}</li>
          <li>{t('profileGate.benefit3')}</li>
        </ul>

        <Link
          to="/profile"
          className="flex w-full items-center justify-center rounded-full bg-[#B91C1C] px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#991B1B]"
        >
          {t('profileGate.cta')}
        </Link>
      </div>
    </div>
  );
};

export default ProfileGate;
