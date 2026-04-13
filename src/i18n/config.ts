import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import nl from './locales/nl.json';
import en from './locales/en.json';
import dashboardEn from './locales/dashboard/en.json';
import dashboardNl from './locales/dashboard/nl.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import bg from './locales/bg.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';

export const languages = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', dir: 'ltr' },
  { code: 'bg', name: 'Български', flag: '🇧🇬', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ns: ['translation', 'dashboard'],
    defaultNS: 'translation',
    resources: {
      nl: { translation: nl, dashboard: dashboardNl },
      en: { translation: en, dashboard: dashboardEn },
      de: { translation: de, dashboard: dashboardEn },
      fr: { translation: fr, dashboard: dashboardEn },
      pl: { translation: pl, dashboard: dashboardEn },
      ro: { translation: ro, dashboard: dashboardEn },
      bg: { translation: bg, dashboard: dashboardEn },
      pt: { translation: pt, dashboard: dashboardEn },
      es: { translation: es, dashboard: dashboardEn },
      tr: { translation: tr, dashboard: dashboardEn },
      ar: { translation: ar, dashboard: dashboardEn },
    },
    fallbackLng: 'nl',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
