import { NavLink, Outlet, useOutlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './SettingsPage.scss';

const SECTIONS = [
  { to: '/settings/categories',      label: 'settings_nav.categories' },
  { to: '/settings/tags',            label: 'settings_nav.tags' },
  { to: '/settings/tag-groups',      label: 'settings_nav.tag_groups' },
  { to: '/settings/payment-methods', label: 'settings_nav.payment_methods' },
  { to: '/settings/events',          label: 'settings_nav.events' },
  { to: '/settings/projects',        label: 'settings_nav.projects' },
  { to: '/settings/profile',         label: 'settings_nav.profile' },
  { to: '/settings/export',          label: 'settings_nav.export' },
] as const;

export function SettingsPage() {
  const { t } = useTranslation();
  const outlet = useOutlet();
  const navigate = useNavigate();

  const nav = (
    <nav className="settings-nav" aria-label={t('nav.settings')}>
      {SECTIONS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `settings-nav__link${isActive ? ' settings-nav__link--active' : ''}`}
        >
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );

  if (outlet) {
    return (
      <div className="settings-layout settings-layout--detail">
        <button className="settings-back" onClick={() => navigate('/settings')}>
          ← {t('nav.settings')}
        </button>
        <div className="settings-nav--desktop">{nav}</div>
        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      {nav}
    </div>
  );
}
