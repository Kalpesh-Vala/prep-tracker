'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStatCard } from '@/components/DashboardStatCard';
import { DashboardProgressBar } from '@/components/DashboardProgressBar';
import { DashboardQuickLinks } from '@/components/DashboardQuickLinks';
import type { DashboardSummaryDTO } from '@/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // Fresh on every load; never cached (FR-009).
    fetch('/api/dashboard/summary', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load the dashboard.');
        if (active) setSummary(body.data as DashboardSummaryDTO);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>;
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!summary) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatCard
          label="Program completion"
          value={`${summary.completionPercentage}%`}
          hint={`Week ${summary.currentWeek} of ${summary.totalWeeks}`}
        />
        <DashboardStatCard
          label="Current streak"
          value={`${summary.currentStreakDays} ${summary.currentStreakDays === 1 ? 'day' : 'days'}`}
          hint="Consecutive study days"
        />
        <DashboardStatCard
          label="DSA problems solved"
          value={`${summary.dsaTotalSolved}`}
          hint={`${summary.dsaSolvedThisWeek} this week`}
        />
      </div>

      <DashboardProgressBar
        label="Study hours toward target"
        current={summary.totalHoursLogged}
        target={summary.targetHours}
      />

      <div className="rounded border border-gray-200 p-4">
        <p className="text-sm text-gray-500">This week’s goals</p>
        {summary.weeklyGoalsStatus === 'set' ? (
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{summary.weeklyGoals}</p>
        ) : (
          <p className="mt-1 text-gray-600">
            Not set yet.{' '}
            <Link href="/weekly-review" className="font-medium text-gray-900 underline">
              Add this week’s review
            </Link>
            .
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">Jump back in</p>
        <DashboardQuickLinks />
      </div>
    </section>
  );
}
