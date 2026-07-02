'use client';

import { useEffect, useState } from 'react';
import type { DailyLogDTO } from '@/types';

interface DailyLogEntryViewProps {
  id: string;
  onEdit: (entry: DailyLogDTO) => void;
  onBack: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-gray-900">{value}</dd>
    </div>
  );
}

export function DailyLogEntryView({ id, onEdit, onBack }: DailyLogEntryViewProps) {
  const [entry, setEntry] = useState<DailyLogDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/daily-log/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load the entry.');
        if (active) setEntry(body.data.entry as DailyLogDTO);
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
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading entry…</p>;
  if (error) {
    return (
      <div>
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
        <button type="button" onClick={onBack} className="mt-4 font-medium text-gray-900 underline">
          Back to history
        </button>
      </div>
    );
  }
  if (!entry) return null;

  return (
    <section className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{formatDate(entry.date)}</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label="Study hours" value={`${entry.studyHours}`} />
        <Detail label="DSA problems solved" value={`${entry.problemsSolved}`} />
        <Detail label="Revision completed" value={entry.revisionCompleted ? 'Yes' : 'No'} />
        {entry.energyLevel ? <Detail label="Energy level" value={entry.energyLevel} /> : null}
        <div className="sm:col-span-2">
          <Detail label="What was learned" value={entry.summary} />
        </div>
        <div className="sm:col-span-2">
          <Detail label="Biggest challenge" value={entry.biggestChallenge} />
        </div>
        <div className="sm:col-span-2">
          <Detail label="Goal for next day" value={entry.nextDayGoal} />
        </div>
      </dl>

      <p className="mt-6 text-xs text-gray-400">
        Last updated {new Date(entry.updatedAt).toLocaleString()}
      </p>
    </section>
  );
}
