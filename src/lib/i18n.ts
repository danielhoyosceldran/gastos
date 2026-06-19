import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import ca from '../locales/ca.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

export type SupportedLanguage = 'en' | 'es' | 'ca' | 'fr' | 'it';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      ca: { translation: ca },
      fr: { translation: fr },
      it: { translation: it },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
