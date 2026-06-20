import { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DashboardIcon,
  TargetIcon,
  BarChartIcon,
  GearIcon,
  SunIcon,
  MoonIcon,
  ExitIcon,
} from '@radix-ui/react-icons';
import type { IconProps } from '@radix-ui/react-icons/dist/types';
import { signOut } from '../../lib/auth';
import { toast } from '../../store/toast.store';
import './AppLayout.scss';

type RadixIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const NAV_ITEMS: { to: string; label: string; Icon: RadixIcon; end: boolean }[] = [
  { to: '/',          label: 'nav.dashboard', Icon: DashboardIcon, end: true  },
  { to: '/budgets',   label: 'nav.budgets',   Icon: TargetIcon,    end: false },
  { to: '/analytics', label: 'nav.analytics', Icon: BarChartIcon,  end: false },
  { to: '/settings',  label: 'nav.settings',  Icon: GearIcon,      end: false },
];

export function AppLayout() {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'dark';
    document.documentElement.dataset.theme = saved;
    setIsDark(saved === 'dark');
  }, []);

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
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              <Icon className="sidebar__icon" aria-hidden="true" width={16} height={16} />
              <span className="sidebar__label">{t(label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button className="sidebar__theme-btn" onClick={toggleTheme} title={t('settings.toggle_theme')}>
            {isDark ? <SunIcon width={15} height={15} /> : <MoonIcon width={15} height={15} />}
          </button>
          <button className="sidebar__signout-btn" onClick={handleSignOut} title={t('auth.sign_out')}>
            <ExitIcon width={13} height={13} />
            {t('auth.sign_out')}
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label={t('nav.main')}>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          >
            <Icon className="bottom-nav__icon" aria-hidden="true" width={18} height={18} />
            <span className="bottom-nav__label">{t(label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
