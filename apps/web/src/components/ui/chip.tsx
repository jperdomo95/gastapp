import type { ButtonHTMLAttributes } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className = '', style, ...props }: ChipProps) {
  if (active) {
    return (
      <button
        className={`inline-flex h-8 items-center gap-1 rounded-pulse-chip px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
        style={{ background: 'linear-gradient(135deg, var(--pulse-v1), var(--pulse-v2))', ...style }}
        {...props}
      />
    );
  }
  return (
    <button
      className={`inline-flex h-8 items-center gap-1 rounded-pulse-chip border border-pulse-stroke bg-pulse-glass px-3 text-xs font-medium text-pulse-dim transition-colors hover:bg-pulse-glass-hi hover:text-pulse-text ${className}`}
      style={style}
      {...props}
    />
  );
}
