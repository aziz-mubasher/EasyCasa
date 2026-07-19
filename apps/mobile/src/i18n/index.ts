import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import it from './locales/it.json';
import es from './locales/es.json';
import ownerEn from './locales/owner.en.json';
import ownerIt from './locales/owner.it.json';
import ownerEs from './locales/owner.es.json';
import proEn from './locales/pro.en.json';
import proIt from './locales/pro.it.json';
import proEs from './locales/pro.es.json';
import paymentEn from './locales/payment.en.json';
import paymentIt from './locales/payment.it.json';
import paymentEs from './locales/payment.es.json';
import discoveryEn from './locales/discovery.en.json';
import discoveryIt from './locales/discovery.it.json';
import discoveryEs from './locales/discovery.es.json';

export const SUPPORTED_LOCALES = ['en', 'it', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function detectLocale(): SupportedLocale {
  const device = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LOCALES as readonly string[]).includes(device)
    ? (device as SupportedLocale)
    : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...en, ...ownerEn, ...proEn, ...paymentEn, ...discoveryEn } },
    it: { translation: { ...it, ...ownerIt, ...proIt, ...paymentIt, ...discoveryIt } },
    es: { translation: { ...es, ...ownerEs, ...proEs, ...paymentEs, ...discoveryEs } },
  },
  lng: detectLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(locale: SupportedLocale): Promise<unknown> {
  return i18n.changeLanguage(locale) as Promise<unknown>;
}

export default i18n;
