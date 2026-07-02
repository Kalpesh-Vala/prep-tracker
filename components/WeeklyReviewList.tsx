'use client';

import { useEffect, useState } from 'react';
import type { WeeklyReviewDTO } from '@/types';

interface WeeklyReviewListProps {
  refreshKey: number;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function formatRange(startISO: string, endISO: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const start = new Date(startISO).toLocaleDateString(undefined, opts);
  const end = new Date(endISO).toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
}

export function WeeklyReviewList({ refreshKey, onSelect, onCreate }: WeeklyReviewListProps) {
  const [items, setItems] = useState<WeeklyReviewDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch('/api/weekly-review')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load reviews.');
        if (active) setItems(body.data.items as WeeklyReviewDTO[]);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Weekly Review</h2>
        <button type="button" onClick={onCreate} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          New review
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading reviews…</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">No weekly reviews yet.</p>
          <button type="button" onClick={onCreate} className="mt-3 font-medium text-gray-900 underline">
            Record your first weekly review
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className="w-full rounded border border-gray-200 p-4 text-left hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Week {r.weekNumber}</span>
                  <span className="text-sm text-gray-500">{formatRange(r.weekStartDate, r.weekEndDate)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Wins:</span> {r.wins}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Weak topics:</span>{' '}
                  {r.weakTopics.length > 0 ? r.weakTopics.join(', ') : '—'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
