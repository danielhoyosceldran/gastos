import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode, HTMLAttributes } from 'react';

interface Props {
  id: string;
  children: (handleProps: HTMLAttributes<HTMLElement>) => ReactNode;
}

export function SortableItem({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}
