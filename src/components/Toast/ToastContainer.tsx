import {
  InfoCircledIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { useToastStore } from '../../store/toast.store';
import './ToastContainer.scss';

type ToastType = 'info' | 'success' | 'error' | 'warning';

const ICONS: Record<ToastType, React.ReactNode> = {
  info:    <InfoCircledIcon width={16} height={16} />,
  success: <CheckCircledIcon width={16} height={16} />,
  error:   <CrossCircledIcon width={16} height={16} />,
  warning: <ExclamationTriangleIcon width={16} height={16} />,
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role="alert">
          <span className="toast__icon" aria-hidden="true">{ICONS[t.type as ToastType]}</span>
          <span className="toast__message">{t.message}</span>
          <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Cross2Icon width={12} height={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
