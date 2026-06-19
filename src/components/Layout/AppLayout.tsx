import { useState, useCallback } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signOut } from '../../lib/auth';
import { toast } from '../../store/toast.store';
import './AppLayout.scss';

const NAV_ITEMS = [
  { to: '/', label: 'nav.dashboard', icon: '⊞', end: true },
  { to: '/expenses', label: 'nav.expenses', icon: '↕', end: false },
  { to: '/budgets', label: 'nav.budgets', icon: '◫', end: false },
  { to: '/export', label: 'nav.export', icon: '↓', end: false },
  { to: '/settings', label: 'nav.settings', icon: '⚙', end: false },
] as const;

export function AppLayout() {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(
    () => document.documentElement.dataset.theme === 'dark'
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      toast.error(t('auth.error_generic'));
    }
  }, [t]);

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setIsDark(!isDark);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">G</span>
          <span className="sidebar__name">gastos</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              <span className="sidebar__icon" aria-hidden="true">{icon}</span>
              <span className="sidebar__label">{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button className="sidebar__theme-btn" onClick={toggleTheme} title={t('settings.toggle_theme')}>
            {isDark ? '☀' : '◐'}
          </button>
          <button className="sidebar__signout-btn" onClick={handleSignOut} title={t('auth.sign_out')}>
            {t('auth.sign_out')}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label={t('nav.main')}>
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon" aria-hidden="true">{icon}</span>
            <span className="bottom-nav__label">{t(label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
