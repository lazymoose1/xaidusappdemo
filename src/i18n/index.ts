import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

// Neutral base locales. Regional dialects (es-MX, es-ES, …) can be added later
// as thin override files; i18next falls back es-XX -> es -> en automatically.
const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // Map any regional Spanish (es-MX, es-419, …) onto the neutral `es` base
    // until specific override files exist.
    nonExplicitSupportedLngs: true,
    supportedLngs: ['en', 'es'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'xaidus_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
