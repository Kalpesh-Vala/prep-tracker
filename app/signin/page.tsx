import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { SignInForm } from '@/components/SignInForm';

export default async function SignInPage() {
  // Already-authenticated users skip the form (spec Edge Cases).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await getSessionUser(token)) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">Prep Tracker</h1>
        <SignInForm />
      </div>
    </main>
  );
}
