import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-black" data-testid="app-layout">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
