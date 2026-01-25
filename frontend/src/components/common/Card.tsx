import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headerRight, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-slate-950/60 backdrop-blur rounded-lg border border-slate-800 shadow-xl p-6 ${className}`}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-xl font-semibold text-slate-100">{title}</h2>}
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
