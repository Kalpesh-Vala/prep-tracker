'use client';

import { useCallback, useEffect, useState } from 'react';
import { DsaProblemForm } from '@/components/DsaProblemForm';
import { DsaFilterBar } from '@/components/DsaFilterBar';
import { DsaProblemTable } from '@/components/DsaProblemTable';
import { DsaSummaryPanel } from '@/components/DsaSummaryPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { DsaFilter, DsaProblemDTO, DsaSummaryDTO } from '@/types';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; problem: DsaProblemDTO };

export default function DsaPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [filters, setFilters] = useState<DsaFilter>({ page: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  const [summary, setSummary] = useState<DsaSummaryDTO | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<DsaProblemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Insights are computed globally (independent of the active list filters).
  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError(null);
    fetch('/api/dsa/summary')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load insights.');
        if (active) setSummary(body.data as DsaSummaryDTO);
      })
      .catch((e: Error) => active && setSummaryError(e.message))
      .finally(() => active && setSummaryLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSaved = useCallback(() => {
    refresh();
    setView({ kind: 'list' });
  }, [refresh]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/dsa/${pendingDelete.id}`, { method: 'DELETE' });
      setPendingDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (view.kind === 'create') {
    return <DsaProblemForm mode="create" onSaved={handleSaved} onCancel={() => setView({ kind: 'list' })} />;
  }
  if (view.kind === 'edit') {
    return (
      <DsaProblemForm
        mode="edit"
        initial={view.problem}
        onSaved={handleSaved}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  const topics = summary?.countsByTopic.map((t) => t.topic) ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">DSA Tracker</h2>
        <button
          type="button"
          onClick={() => setView({ kind: 'create' })}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add problem
        </button>
      </div>

      <DsaSummaryPanel summary={summary} loading={summaryLoading} error={summaryError} />

      <DsaFilterBar filters={filters} topics={topics} onChange={setFilters} />

      <DsaProblemTable
        filters={filters}
        refreshKey={refreshKey}
        onEdit={(problem) => setView({ kind: 'edit', problem })}
        onDelete={(problem) => setPendingDelete(problem)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete problem?"
        message={`This permanently removes "${pendingDelete?.title ?? ''}". This cannot be undone.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
