import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';

export type SupportedLanguage = 'en' | 'es' | 'ca' | 'fr' | 'it';

const LOADERS: Partial<Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>>> = {
  es: () => import('../locales/es.json'),
  ca: () => import('../locales/ca.json'),
  fr: () => import('../locales/fr.json'),
  it: () => import('../locales/it.json'),
};

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', async (lng: string) => {
  const loader = LOADERS[lng as SupportedLanguage];
  if (!loader || i18n.hasResourceBundle(lng, 'translation')) return;
  const mod = await loader();
  i18n.addResourceBundle(lng, 'translation', mod.default);
  i18n.changeLanguage(lng);
});

export default i18n;
