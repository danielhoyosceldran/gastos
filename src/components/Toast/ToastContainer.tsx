import { useToastStore } from '../../store/toast.store';
import './ToastContainer.scss';

const ICONS: Record<string, string> = {
  info: 'ℹ',
  success: '✓',
  error: '✕',
  warning: '⚠',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role="alert">
          <span className="toast__icon" aria-hidden="true">{ICONS[t.type]}</span>
          <span className="toast__message">{t.message}</span>
          <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
