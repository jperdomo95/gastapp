import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant = 'primary', size = 'md', asChild, style, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';

  const variantProps: { className: string; style?: React.CSSProperties } = (() => {
    switch (variant) {
      case 'primary':
        return {
          className: 'text-white font-semibold',
          style: { background: 'linear-gradient(135deg, var(--pulse-v1), var(--pulse-v2))', ...style },
        };
      case 'secondary':
        return {
          className: 'bg-pulse-glass border border-pulse-stroke text-pulse-text hover:bg-pulse-glass-hi',
          style,
        };
      case 'ghost':
        return {
          className: 'text-pulse-dim hover:bg-pulse-glass hover:text-pulse-text',
          style,
        };
      case 'danger':
        return {
          className: 'bg-red-600/80 border border-red-500/40 text-white hover:bg-red-600',
          style,
        };
    }
  })();

  return (
    <Comp
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-pulse-chip font-medium transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-v2 focus-visible:ring-offset-2 focus-visible:ring-offset-pulse-bg ${variantProps.className} ${sizeClass[size]} ${className}`}
      style={variantProps.style}
      {...props}
    />
  );
});

import type React from 'react';
