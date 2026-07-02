'use client';

import type { DsaSummaryDTO } from '@/types';

interface DsaSummaryPanelProps {
  summary: DsaSummaryDTO | null;
  loading: boolean;
  error: string | null;
}

export function DsaSummaryPanel({ summary, loading, error }: DsaSummaryPanelProps) {
  if (loading) return <p className="text-gray-500">Loading insights…</p>;
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Total solved</p>
        <p className="mt-1 text-3xl font-semibold">{summary.totalSolved}</p>
        <p className="mt-2 text-xs text-gray-500">
          {summary.countsByDifficulty.easy} easy · {summary.countsByDifficulty.medium} medium ·{' '}
          {summary.countsByDifficulty.hard} hard
        </p>
      </div>

      <div className="rounded border border-gray-200 p-4">
        <p className="text-sm text-gray-500">By topic</p>
        {summary.countsByTopic.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No topics yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {summary.countsByTopic.slice(0, 6).map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span className="text-gray-700">{t.topic}</span>
                <span className="font-medium">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Weakest topics</p>
        {summary.weakTopics.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Log problems to see weak spots.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {summary.weakTopics.map((t) => (
              <li key={t.topic} className="flex justify-between">
                <span className="text-gray-700">{t.topic}</span>
                <span className="text-gray-500">
                  avg {t.averageConfidence.toFixed(1)} · {t.needsRevisionCount} to revise
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
