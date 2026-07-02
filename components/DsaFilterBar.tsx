'use client';

import type { Difficulty, DsaFilter } from '@/types';

interface DsaFilterBarProps {
  filters: DsaFilter;
  topics: string[];
  onChange: (filters: DsaFilter) => void;
}

export function DsaFilterBar({ filters, topics, onChange }: DsaFilterBarProps) {
  const selectCls = 'rounded border border-gray-300 px-3 py-2 text-sm';

  function set<K extends keyof DsaFilter>(key: K, value: DsaFilter[K]) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  const active =
    filters.topic || filters.difficulty || filters.needsRevision || filters.interviewWorthy;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by topic"
        value={filters.topic ?? ''}
        onChange={(e) => set('topic', e.target.value || undefined)}
        className={selectCls}
      >
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        aria-label="Filter by difficulty"
        value={filters.difficulty ?? ''}
        onChange={(e) => set('difficulty', (e.target.value || undefined) as Difficulty | undefined)}
        className={selectCls}
      >
        <option value="">All difficulties</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={filters.needsRevision ?? false}
          onChange={(e) => set('needsRevision', e.target.checked || undefined)}
          className="h-4 w-4"
        />
        Needs revision
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={filters.interviewWorthy ?? false}
          onChange={(e) => set('interviewWorthy', e.target.checked || undefined)}
          className="h-4 w-4"
        />
        Interview-worthy
      </label>

      {active ? (
        <button
          type="button"
          onClick={() => onChange({ page: 1, limit: filters.limit })}
          className="text-sm font-medium text-gray-600 underline"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
