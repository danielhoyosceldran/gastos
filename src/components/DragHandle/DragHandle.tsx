import type { HTMLAttributes } from 'react';
import './DragHandle.scss';

export function DragHandle(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="drag-handle" {...props}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <line x1="3" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
