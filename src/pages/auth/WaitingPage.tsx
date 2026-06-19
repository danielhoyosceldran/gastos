import { useTranslation } from 'react-i18next';
import { signOut } from '../../lib/auth';
import './WaitingPage.scss';

export function WaitingPage() {
  const { t } = useTranslation();

  return (
    <div className="waiting-page">
      <div className="waiting-card">
        <h1 className="waiting-title">{t('auth.waiting_title')}</h1>
        <p className="waiting-body">{t('auth.waiting_body')}</p>
        <button className="waiting-btn" onClick={() => signOut()}>
          {t('auth.sign_out')}
        </button>
      </div>
    </div>
  );
}
