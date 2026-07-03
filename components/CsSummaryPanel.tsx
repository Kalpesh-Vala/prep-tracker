'use client';

import { useEffect, useState } from 'react';
import type { CsConceptDTO, CsSummaryDTO } from '@/types';

interface CsSummaryPanelProps {
  refreshKey: number;
  onOpenWeak?: (concept: CsConceptDTO) => void;
}

const STAGE_LABELS: Record<string, string> = {
  learned: 'Learned',
  revised: 'Revised',
  can_explain: 'Can explain',
  interview_ready: 'Interview-ready',
};

export function CsSummaryPanel({ refreshKey, onOpenWeak }: CsSummaryPanelProps) {
  const [summary, setSummary] = useState<CsSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch('/api/cs-fundamentals/summary')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load summary.');
        if (active) setSummary(body.data as CsSummaryDTO);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) return <p className="text-gray-500">Loading summary…</p>;
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-gray-200 p-3">
          <div className="text-2xl font-semibold">{summary.totalConcepts}</div>
          <div className="text-xs text-gray-500">Total concepts</div>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <div className="text-2xl font-semibold">{summary.interviewReadyPercentageOverall}%</div>
          <div className="text-xs text-gray-500">Interview-ready</div>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <div className="text-2xl font-semibold">{summary.weakConcepts.length}</div>
          <div className="text-xs text-gray-500">Weak concepts</div>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <div className="text-2xl font-semibold">
            {Object.values(summary.countsByStage).reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-xs text-gray-500">Tracked</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border border-gray-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">By domain</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(summary.countsByDomain).map(([domain, count]) => (
              <li key={domain} className="flex justify-between">
                <span>{domain}</span>
                <span className="text-gray-600">
                  {count} · {summary.interviewReadyPercentageByDomain[domain as keyof typeof summary.interviewReadyPercentageByDomain]}% ready
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border border-gray-200 p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">By stage</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(summary.countsByStage).map(([stage, count]) => (
              <li key={stage} className="flex justify-between">
                <span>{STAGE_LABELS[stage] ?? stage}</span>
                <span className="text-gray-600">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {summary.weakConcepts.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Weak concepts to revisit</h3>
          <ul className="space-y-1 text-sm">
            {summary.weakConcepts.map((c) => (
              <li key={c.id} className="flex justify-between">
                <button
                  type="button"
                  onClick={() => onOpenWeak?.(c)}
                  className="text-left font-medium text-amber-900 underline"
                >
                  {c.title}
                  {c.subtopic ? <span className="text-amber-700"> · {c.subtopic}</span> : null}
                </button>
                <span className="text-amber-700">{c.domain} · conf {c.confidence}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
