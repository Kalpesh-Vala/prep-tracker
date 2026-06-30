import type { SessionUser } from '@/types';
import { Sidebar } from './Sidebar';

export function AppShell({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 p-8" aria-label="Main content">
        {children}
      </main>
    </div>
  );
}
