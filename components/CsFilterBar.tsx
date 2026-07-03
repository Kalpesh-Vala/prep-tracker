'use client';

import type { CsDomain, CsFilter, CsStage } from '@/types';

const DOMAINS: CsDomain[] = ['DBMS', 'OS', 'NETWORKS', 'OOP'];
const STAGES: { value: CsStage; label: string }[] = [
  { value: 'learned', label: 'Learned' },
  { value: 'revised', label: 'Revised' },
  { value: 'can_explain', label: 'Can explain' },
  { value: 'interview_ready', label: 'Interview-ready' },
];

type Band = '' | 'low' | 'medium' | 'high';

interface CsFilterBarProps {
  filters: CsFilter;
  onChange: (filters: CsFilter) => void;
}

function bandOf(filters: CsFilter): Band {
  if (filters.confidenceMin === 1 && filters.confidenceMax === 2) return 'low';
  if (filters.confidenceMin === 3 && filters.confidenceMax === 3) return 'medium';
  if (filters.confidenceMin === 4 && filters.confidenceMax === 5) return 'high';
  return '';
}

export function CsFilterBar({ filters, onChange }: CsFilterBarProps) {
  const selectCls = 'rounded border border-gray-300 px-3 py-2 text-sm';

  function set(patch: Partial<CsFilter>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function setBand(band: Band) {
    const map: Record<Band, Partial<CsFilter>> = {
      '': { confidenceMin: undefined, confidenceMax: undefined },
      low: { confidenceMin: 1, confidenceMax: 2 },
      medium: { confidenceMin: 3, confidenceMax: 3 },
      high: { confidenceMin: 4, confidenceMax: 5 },
    };
    set(map[band]);
  }

  const active =
    filters.domain || filters.stage || filters.confidenceMin || filters.notInterviewReady || filters.weakOnly;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select aria-label="Filter by domain" value={filters.domain ?? ''} onChange={(e) => set({ domain: (e.target.value || undefined) as CsDomain | undefined })} className={selectCls}>
        <option value="">All domains</option>
        {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      <select aria-label="Filter by stage" value={filters.stage ?? ''} onChange={(e) => set({ stage: (e.target.value || undefined) as CsStage | undefined })} className={selectCls}>
        <option value="">All stages</option>
        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select aria-label="Filter by confidence band" value={bandOf(filters)} onChange={(e) => setBand(e.target.value as Band)} className={selectCls}>
        <option value="">Any confidence</option>
        <option value="low">Low (1–2)</option>
        <option value="medium">Medium (3)</option>
        <option value="high">High (4–5)</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={filters.notInterviewReady ?? false} onChange={(e) => set({ notInterviewReady: e.target.checked || undefined })} className="h-4 w-4" />
        Not interview-ready
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={filters.weakOnly ?? false} onChange={(e) => set({ weakOnly: e.target.checked || undefined })} className="h-4 w-4" />
        Weak only
      </label>

      {active ? (
        <button type="button" onClick={() => onChange({ page: 1, limit: filters.limit })} className="text-sm font-medium text-gray-600 underline">
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
