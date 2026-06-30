import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export default async function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Authoritative server-side session validation (Node runtime).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) {
    redirect('/signin');
  }

  return <AppShell user={user}>{children}</AppShell>;
}
