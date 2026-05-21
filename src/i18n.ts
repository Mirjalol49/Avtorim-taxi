import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en'] as const;
const DEFAULT_LANGUAGE = 'uz';
const savedLanguage = typeof window !== 'undefined'
    ? window.localStorage.getItem('avtorim_lang')
    : null;
const initialLanguage = savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as typeof SUPPORTED_LANGUAGES[number])
    ? savedLanguage
    : DEFAULT_LANGUAGE;

i18n
    // load translation using http -> see /public/locales
    .use(Backend)
    // detect user language
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next
    .use(initReactI18next)
    // init i18next
    .init({
        lng: initialLanguage,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        backend: {
            loadPath: '/locales/{{lng}}/translation.json?v=5',
        },

        detection: {
            // First visit must be deterministic: Uzbek is default.
            // Manual language switches persist in this key; browser navigator is intentionally ignored.
            order: ['localStorage'],
            lookupLocalStorage: 'avtorim_lang',
            caches: ['localStorage'],
        }
    });

export default i18n;
