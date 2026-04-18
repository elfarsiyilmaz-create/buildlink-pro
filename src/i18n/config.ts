import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
import it from './locales/it.json';
import uk from './locales/uk.json';
import sr from './locales/sr.json';
import hr from './locales/hr.json';
import sq from './locales/sq.json';
import ru from './locales/ru.json';
import el from './locales/el.json';

/** Same key i18next-browser-languagedetector used — keeps existing user prefs */
export const I18N_LANGUAGE_STORAGE_KEY = 'i18nextLng';

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
  { code: 'it', name: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸', dir: 'ltr' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷', dir: 'ltr' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷', dir: 'ltr' },
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

const supportedCodes = new Set<string>(languages.map(l => l.code));

/**
 * Maps BCP-47 / locale strings (e.g. nl-NL, en_US) to a supported app language code.
 * Unknown → nl (fallbackLng).
 */
export function normalizeToSupportedLanguage(raw: string): LanguageCode {
  const base = raw.trim().replace('_', '-').split('-')[0]?.toLowerCase() ?? '';
  if (!base) return 'nl';
  return supportedCodes.has(base) ? (base as LanguageCode) : 'nl';
}

/**
 * First-open language detection lives here:
 * - If `localStorage` already has a saved choice → keep it (normalized).
 * - Else → `navigator.languages[0]`, fallback `navigator.language`, then normalize.
 * Later, multi-device sync can mirror this value from the user profile (e.g. `profiles.preferred_language`).
 */
export function resolveInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'nl';
  try {
    const stored = window.localStorage.getItem(I18N_LANGUAGE_STORAGE_KEY);
    if (stored != null && stored !== '') {
      return normalizeToSupportedLanguage(stored);
    }
  } catch {
    /* private / restricted storage */
  }

  if (typeof navigator === 'undefined') return 'nl';
  const raw = navigator.languages?.[0] ?? navigator.language ?? 'nl';
  return normalizeToSupportedLanguage(raw);
}

function syncDocumentDirection(lng: string) {
  if (typeof document === 'undefined') return;
  const code = normalizeToSupportedLanguage(lng);
  const lang = languages.find(l => l.code === code);
  document.documentElement.dir = lang?.dir ?? 'ltr';
}

/** Persists manual or detected language; profile sync can call the same shape from Supabase later */
function persistLanguageChoice(lng: string) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(I18N_LANGUAGE_STORAGE_KEY, normalizeToSupportedLanguage(lng));
    }
  } catch {
    /* private mode */
  }
}

i18n.on('languageChanged', lng => {
  syncDocumentDirection(lng);
  persistLanguageChoice(lng);
});

void i18n
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
      it: { translation: it, dashboard: dashboardEn },
      uk: { translation: uk, dashboard: dashboardEn },
      sr: { translation: sr, dashboard: dashboardEn },
      hr: { translation: hr, dashboard: dashboardEn },
      sq: { translation: sq, dashboard: dashboardEn },
      ru: { translation: ru, dashboard: dashboardEn },
      el: { translation: el, dashboard: dashboardEn },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: 'nl',
    interpolation: { escapeValue: false },
  })
  .then(() => {
    syncDocumentDirection(i18n.language);
    persistLanguageChoice(i18n.language);
  });

export default i18n;
