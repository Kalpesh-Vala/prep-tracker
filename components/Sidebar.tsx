'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { SessionUser } from '@/types';

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Daily Log', href: '/daily-log' },
  { label: 'DSA', href: '/dsa' },
  { label: 'Weekly Review', href: '/weekly-review' },
  { label: 'CS Fundamentals', href: '/cs-fundamentals' },
] as const;

export function Sidebar({ user }: Readonly<{ user: SessionUser }>) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/signin');
    router.refresh();
  }

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white p-4">
      <div className="mb-6">
        <p className="text-lg font-semibold">Prep Tracker</p>
        <p className="truncate text-sm text-gray-500">{user.username}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded px-3 py-2 text-sm font-medium ${
                active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-4 rounded px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Sign out
      </button>
    </aside>
  );
}
