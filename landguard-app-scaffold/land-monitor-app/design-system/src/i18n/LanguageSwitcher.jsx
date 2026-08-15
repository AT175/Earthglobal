import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import Select from '../components/molecules/Select';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

// Drop this into any layout/settings page to let a user switch language.
// Persists via i18next-browser-languagedetector's localStorage cache (see createI18n.js).
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Globe size={16} aria-hidden="true" />
      <Select
        value={i18n.resolvedLanguage}
        onValueChange={(lng) => i18n.changeLanguage(lng)}
        options={LANGUAGES}
        placeholder="Language"
        aria-label="Select language"
      />
    </div>
  );
}
