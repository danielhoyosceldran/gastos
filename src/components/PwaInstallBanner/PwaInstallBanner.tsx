import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross2Icon, DownloadIcon } from '@radix-ui/react-icons';
import './PwaInstallBanner.scss';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (!isMobile()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    if (isIos()) {
      setShowIosBanner(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pwa-banner" role="banner">
      <span className="pwa-banner__icon" aria-hidden="true">
        <DownloadIcon width={18} height={18} />
      </span>
      <div className="pwa-banner__text">
        <span className="pwa-banner__title">{t('pwa.title')}</span>
        {showIosBanner && (
          <span className="pwa-banner__hint">{t('pwa.ios_hint')}</span>
        )}
      </div>
      {!showIosBanner && (
        <button className="pwa-banner__install" onClick={handleInstall}>
          {t('pwa.install')}
        </button>
      )}
      <button className="pwa-banner__dismiss" onClick={handleDismiss} aria-label={t('pwa.dismiss')}>
        <Cross2Icon width={14} height={14} />
      </button>
    </div>
  );
}
