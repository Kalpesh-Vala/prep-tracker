import Link from 'next/link';

const LINKS = [
  { href: '/daily-log', label: 'Daily Log', description: 'Log today’s study' },
  { href: '/dsa', label: 'DSA Tracker', description: 'Add a solved problem' },
  { href: '/weekly-review', label: 'Weekly Review', description: 'Reflect on the week' },
] as const;

export function DashboardQuickLinks() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded border border-gray-200 p-4 transition hover:border-gray-400 hover:bg-gray-50"
        >
          <p className="font-medium text-gray-900">{link.label}</p>
          <p className="mt-1 text-sm text-gray-500">{link.description}</p>
        </Link>
      ))}
    </div>
  );
}
