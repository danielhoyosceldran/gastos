import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { signIn } from '../../lib/auth';
import './LoginPage.scss';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">{t('auth.title')}</h1>
        <p className="login-subtitle">{t('auth.subtitle')}</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              className="field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              className="field__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading || !email || !password}>
            {loading ? t('auth.signing_in') : t('auth.sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
}
