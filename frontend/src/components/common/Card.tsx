import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-slate-950/60 backdrop-blur rounded-lg border border-slate-800 shadow-xl p-6 ${className}`}
    >
      {title && <h2 className="text-xl font-semibold mb-4 text-slate-100">{title}</h2>}
      {children}
    </div>
  );
}
