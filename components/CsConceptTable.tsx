'use client';

import { useEffect, useState } from 'react';
import type { CsConceptDTO, CsFilter, CsStage } from '@/types';

const STAGES: { value: CsStage; label: string }[] = [
  { value: 'learned', label: 'Learned' },
  { value: 'revised', label: 'Revised' },
  { value: 'can_explain', label: 'Can explain' },
  { value: 'interview_ready', label: 'Interview-ready' },
];

interface CsConceptTableProps {
  filters: CsFilter;
  refreshKey: number;
  onEdit: (concept: CsConceptDTO) => void;
  onArchive: (concept: CsConceptDTO) => void;
  onChanged: () => void;
}

function buildQuery(filters: CsFilter): string {
  const p = new URLSearchParams();
  if (filters.domain) p.set('domain', filters.domain);
  if (filters.stage) p.set('stage', filters.stage);
  if (filters.confidenceMin) p.set('confidenceMin', String(filters.confidenceMin));
  if (filters.confidenceMax) p.set('confidenceMax', String(filters.confidenceMax));
  if (filters.notInterviewReady) p.set('notInterviewReady', 'true');
  if (filters.weakOnly) p.set('weakOnly', 'true');
  if (filters.page) p.set('page', String(filters.page));
  if (filters.limit) p.set('limit', String(filters.limit));
  const s = p.toString();
  return s ? `?${s}` : '';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function isWeak(c: CsConceptDTO): boolean {
  if (c.confidence <= 2) return true;
  const days = (Date.now() - new Date(c.lastRevisedAt).getTime()) / 86_400_000;
  return days > 14;
}

const anyActive = (f: CsFilter) =>
  Boolean(f.domain || f.stage || f.confidenceMin || f.notInterviewReady || f.weakOnly);

export function CsConceptTable({ filters, refreshKey, onEdit, onArchive, onChanged }: CsConceptTableProps) {
  const [items, setItems] = useState<CsConceptDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/cs-fundamentals${buildQuery(filters)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load concepts.');
        if (active) setItems(body.data.items as CsConceptDTO[]);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, refreshKey]);

  async function patch(concept: CsConceptDTO, body: Record<string, unknown>) {
    setSavingId(concept.id);
    try {
      const res = await fetch(`/api/cs-fundamentals/${concept.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) onChanged();
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-gray-500">Loading concepts…</p>;
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-600">
        {anyActive(filters) ? 'No matching concepts for the active filters.' : 'No concepts tracked yet.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2">Concept</th>
            <th className="px-3 py-2">Domain</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Last revised</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">
                  {c.title}
                  {isWeak(c) ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Weak</span>
                  ) : null}
                </div>
                {c.subtopic ? <div className="text-xs text-gray-500">{c.subtopic}</div> : null}
              </td>
              <td className="px-3 py-2">{c.domain}</td>
              <td className="px-3 py-2">
                <select
                  aria-label={`Stage for ${c.title}`}
                  value={c.stage}
                  disabled={savingId === c.id}
                  onChange={(e) => patch(c, { stage: e.target.value })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <select
                  aria-label={`Confidence for ${c.title}`}
                  value={c.confidence}
                  disabled={savingId === c.id}
                  onChange={(e) => patch(c, { confidence: Number(e.target.value) })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(c.lastRevisedAt)}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEdit(c)} className="font-medium text-gray-700 underline">Edit</button>
                  <button type="button" onClick={() => onArchive(c)} className="font-medium text-red-600 underline">Archive</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
