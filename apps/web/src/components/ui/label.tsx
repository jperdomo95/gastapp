import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentPropsWithoutRef } from 'react';

export function Label({ className = '', ...props }: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={`text-sm font-medium text-neutral-700 ${className}`}
      {...props}
    />
  );
}
