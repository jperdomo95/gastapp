import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`h-10 w-full rounded-md border border-pulse-stroke bg-pulse-glass px-3 text-sm text-pulse-text placeholder:text-pulse-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-v2 focus-visible:ring-offset-1 focus-visible:ring-offset-pulse-bg ${className}`}
        {...props}
      />
    );
  },
);
