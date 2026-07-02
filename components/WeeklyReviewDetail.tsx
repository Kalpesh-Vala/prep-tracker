'use client';

import { useEffect, useState } from 'react';
import type { WeeklyReviewDTO } from '@/types';

interface WeeklyReviewDetailProps {
  id: string;
  onEdit: (review: WeeklyReviewDTO) => void;
  onBack: () => void;
}

function formatRange(startISO: string, endISO: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return `${new Date(startISO).toLocaleDateString(undefined, opts)} – ${new Date(endISO).toLocaleDateString(undefined, opts)}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-gray-900">{value}</dd>
    </div>
  );
}

export function WeeklyReviewDetail({ id, onEdit, onBack }: WeeklyReviewDetailProps) {
  const [review, setReview] = useState<WeeklyReviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/weekly-review/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load the review.');
        if (active) setReview(body.data.review as WeeklyReviewDTO);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading review…</p>;
  if (error) {
    return (
      <div>
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        <button type="button" onClick={onBack} className="mt-4 font-medium text-gray-900 underline">Back to list</button>
      </div>
    );
  }
  if (!review) return null;

  return (
    <section className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Week {review.weekNumber}</h2>
          <p className="text-sm text-gray-500">{formatRange(review.weekStartDate, review.weekEndDate)}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => onEdit(review)} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">Edit</button>
          <button type="button" onClick={onBack} className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Back</button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Detail label="Study hours" value={`${review.totalStudyHours}`} />
        <Detail label="Problems solved" value={`${review.problemsSolved}`} />
        <Detail label="Success rate" value={typeof review.dsaAccuracyPercent === 'number' ? `${review.dsaAccuracyPercent}%` : '—'} />
      </dl>

      <dl className="mt-4 space-y-4">
        <Detail label="Planned" value={review.plannedWork} />
        <Detail label="Completed" value={review.completedWork} />
        <Detail label="Weak topics" value={review.weakTopics.length > 0 ? review.weakTopics.join(', ') : '—'} />
        <Detail label="Wins" value={review.wins} />
        <Detail label="Adjustments for next week" value={review.nextWeekAdjustments} />
      </dl>

      <p className="mt-6 text-xs text-gray-400">Last updated {new Date(review.updatedAt).toLocaleString()}</p>
    </section>
  );
}
