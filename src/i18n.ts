import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
    // load translation using http -> see /public/locales
    .use(Backend)
    // detect user language
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next
    .use(initReactI18next)
    // init i18next
    .init({
        // Uzbek is the primary language of the platform
        fallbackLng: 'uz',
        supportedLngs: ['uz', 'ru', 'en'],
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        backend: {
            loadPath: '/locales/{{lng}}/translation.json',
        },

        detection: {
            // Check global localStorage key first, then browser navigator
            // Per-account language is applied on top of this in App.tsx after login.
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'avtorim_lang',
            caches: ['localStorage'],
        }
    });

export default i18n;
