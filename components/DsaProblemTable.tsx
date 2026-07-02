'use client';

import { useEffect, useState } from 'react';
import type { DsaFilter, DsaProblemDTO } from '@/types';

interface DsaProblemTableProps {
  filters: DsaFilter;
  refreshKey: number;
  onEdit: (problem: DsaProblemDTO) => void;
  onDelete: (problem: DsaProblemDTO) => void;
}

function buildQuery(filters: DsaFilter): string {
  const p = new URLSearchParams();
  if (filters.topic) p.set('topic', filters.topic);
  if (filters.difficulty) p.set('difficulty', filters.difficulty);
  if (filters.needsRevision) p.set('needsRevision', 'true');
  if (filters.interviewWorthy) p.set('interviewWorthy', 'true');
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

const anyActive = (f: DsaFilter) =>
  Boolean(f.topic || f.difficulty || f.needsRevision || f.interviewWorthy);

export function DsaProblemTable({ filters, refreshKey, onEdit, onDelete }: DsaProblemTableProps) {
  const [items, setItems] = useState<DsaProblemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/dsa${buildQuery(filters)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load problems.');
        if (active) setItems(body.data.items as DsaProblemDTO[]);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, refreshKey]);

  if (loading) return <p className="text-gray-500">Loading problems…</p>;
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-600">
        {anyActive(filters) ? 'No matching problems for the active filters.' : 'No problems logged yet.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Topic</th>
            <th className="px-3 py-2">Difficulty</th>
            <th className="px-3 py-2">Platform</th>
            <th className="px-3 py-2">Min</th>
            <th className="px-3 py-2">Conf.</th>
            <th className="px-3 py-2">Revise?</th>
            <th className="px-3 py-2">Interview?</th>
            <th className="px-3 py-2">Solved</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{p.title}</td>
              <td className="px-3 py-2 text-gray-700">
                {p.topic}
                {p.subtopic ? <span className="text-gray-400"> / {p.subtopic}</span> : null}
              </td>
              <td className="px-3 py-2 capitalize">{p.difficulty}</td>
              <td className="px-3 py-2">{p.platform}</td>
              <td className="px-3 py-2">{p.timeTakenMinutes}</td>
              <td className="px-3 py-2">{p.confidence}</td>
              <td className="px-3 py-2">{p.needsRevision ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2">{p.interviewWorthy ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(p.solvedOn)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-right">
                <button type="button" onClick={() => onEdit(p)} className="font-medium text-gray-700 hover:underline">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(p)} className="ml-3 font-medium text-red-600 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
