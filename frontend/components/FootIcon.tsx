import type { GridPosition } from '@/lib/types';

const ARROW_MAP: Record<GridPosition, string | null> = {
  T:  '/arrows/up.svg',
  L:  '/arrows/left.svg',
  M:  null,
  R:  '/arrows/right.svg',
  B:  '/arrows/down.svg',
};

interface FootIconProps {
  position: GridPosition;
}

export function FootIcon({ position }: FootIconProps) {
  const src = ARROW_MAP[position];

  if (!src) {
    return <div className="w-14 h-14" />;
  }

  return (
    <img
      src={src}
      alt={position}
      className="w-14 h-14 object-contain"
      draggable={false}
    />
  );
}
