'use client';

import { useEffect, useState } from 'react';
import type { DailyLogDTO } from '@/types';

interface DailyLogListProps {
  refreshKey: number;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function DailyLogList({ refreshKey, onSelect, onCreate }: DailyLogListProps) {
  const [entries, setEntries] = useState<DailyLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch('/api/daily-log')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load entries.');
        if (active) setEntries(body.data.entries as DailyLogDTO[]);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Daily Log</h2>
        <button
          type="button"
          onClick={onCreate}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Log today
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading entries…</p>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">No entries yet.</p>
          <button type="button" onClick={onCreate} className="mt-3 font-medium text-gray-900 underline">
            Log your first day
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{formatDate(entry.date)}</span>
                <span className="flex gap-4 text-sm text-gray-600">
                  <span>{entry.studyHours} h</span>
                  <span>{entry.problemsSolved} DSA</span>
                  <span>{entry.revisionCompleted ? 'Revised' : 'No revision'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
