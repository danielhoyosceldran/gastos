import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/auth.store';
import { profileService, type UpdateProfileDTO } from '../../../services/supabase/profile.service';
import { toast } from '../../../store/toast.store';
import type { SupportedLanguage } from '../../../lib/i18n';
import i18n from '../../../lib/i18n';
import './ProfilePage.scss';
import '../../../components/SettingsList/SettingsList.scss';

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

const COLORS = [
  { key: 'blue' as const, hex: '#4F88DB', label: 'Blue' },
  { key: 'green' as const, hex: '#4A7C6F', label: 'Green' },
  { key: 'red' as const, hex: '#9B4A4A', label: 'Red' },
];

export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  async function update(dto: UpdateProfileDTO) {
    setSaving(true);
    try {
      if (dto.currency && dto.currency !== profile!.currency) {
        const hasLive = await profileService.hasLiveBudgetsInCurrency(profile!.currency);
        if (hasLive) toast.warning(t('profile.currency_live_budget_warning'));
      }
      const updated = await profileService.update(profile!.id, dto);
      setProfile({ ...profile!, ...updated });
      if (dto.language) i18n.changeLanguage(dto.language);
      if (dto.theme) {
        document.documentElement.dataset.theme = dto.theme;
        localStorage.setItem('theme', dto.theme);
      }
      if (dto.primary_color) document.documentElement.dataset.color = dto.primary_color;
      toast.success(t('common.saved'));
    } catch { toast.error(t('common.error_save')); }
    finally { setSaving(false); }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{t('settings_nav.profile')}</h1>
      </div>

      <div className="profile-form">
        <div className="profile-section">
          <h2 className="profile-section__title">{t('profile.account')}</h2>
          <div className="profile-row">
            <span className="profile-row__label">{t('auth.email')}</span>
            <span className="profile-row__value">{profile.email}</span>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section__title">{t('profile.language')}</h2>
          <div className="profile-options">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                className={`profile-option${profile.language === code ? ' profile-option--active' : ''}`}
                onClick={() => update({ language: code })}
                disabled={saving}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section__title">{t('profile.currency')}</h2>
          <div className="field" style={{ maxWidth: '200px' }}>
            <input
              className="field__input"
              defaultValue={profile.currency}
              onBlur={(e) => {
                const val = e.target.value.trim().toUpperCase();
                if (val !== profile.currency && /^[A-Z]{3}$/.test(val)) {
                  update({ currency: val });
                }
              }}
              placeholder="EUR"
              maxLength={3}
            />
            <span className="field__hint">{t('profile.currency_hint')}</span>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section__title">{t('profile.primary_color')}</h2>
          <div className="profile-options">
            {COLORS.map(({ key, hex, label }) => (
              <button
                key={key}
                className={`profile-color-option${profile.primary_color === key ? ' profile-color-option--active' : ''}`}
                onClick={() => update({ primary_color: key })}
                disabled={saving}
                title={label}
              >
                <span className="profile-color-option__swatch" style={{ backgroundColor: hex }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h2 className="profile-section__title">{t('profile.theme')}</h2>
          <div className="profile-options">
            <button
              className={`profile-option${profile.theme === 'light' ? ' profile-option--active' : ''}`}
              onClick={() => update({ theme: 'light' })}
              disabled={saving}
            >
              {t('profile.theme_light')}
            </button>
            <button
              className={`profile-option${profile.theme === 'dark' ? ' profile-option--active' : ''}`}
              onClick={() => update({ theme: 'dark' })}
              disabled={saving}
            >
              {t('profile.theme_dark')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
