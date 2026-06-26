import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hero?: boolean;
}

export function Card({ className = '', hero = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-pulse-card border border-pulse-stroke shadow-pulse-card backdrop-blur-xl ${
        hero ? 'gradient-hero-bg' : 'bg-pulse-glass'
      } ${className}`}
      {...props}
    />
  );
}
