import { Sidebar, type NavItem } from './Sidebar';

interface AppLayoutProps {
  currentNav: NavItem;
  onNavChange: (nav: NavItem) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentNav, onNavChange, children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-black" data-testid="app-layout">
      <Sidebar currentNav={currentNav} onNavChange={onNavChange} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
