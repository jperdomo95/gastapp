import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentPropsWithoutRef } from 'react';

export function Label({ className = '', ...props }: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={`text-xs font-medium uppercase tracking-wide text-pulse-dim ${className}`}
      {...props}
    />
  );
}
