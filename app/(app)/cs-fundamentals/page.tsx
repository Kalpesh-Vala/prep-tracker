'use client';

import { useCallback, useState } from 'react';
import { CsConceptForm } from '@/components/CsConceptForm';
import { CsFilterBar } from '@/components/CsFilterBar';
import { CsConceptTable } from '@/components/CsConceptTable';
import { CsSummaryPanel } from '@/components/CsSummaryPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CsConceptDTO, CsFilter } from '@/types';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; concept: CsConceptDTO };

export default function CsFundamentalsPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [filters, setFilters] = useState<CsFilter>({ page: 1 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingArchive, setPendingArchive] = useState<CsConceptDTO | null>(null);
  const [archiving, setArchiving] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSaved = useCallback(() => {
    refresh();
    setView({ kind: 'list' });
  }, [refresh]);

  async function loadConcept(id: string): Promise<CsConceptDTO | null> {
    const res = await fetch(`/api/cs-fundamentals/${id}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body.data.concept as CsConceptDTO;
  }

  async function confirmArchive() {
    if (!pendingArchive) return;
    setArchiving(true);
    try {
      await fetch(`/api/cs-fundamentals/${pendingArchive.id}`, { method: 'DELETE' });
      setPendingArchive(null);
      refresh();
    } finally {
      setArchiving(false);
    }
  }

  if (view.kind === 'create') {
    return (
      <CsConceptForm
        mode="create"
        onSaved={handleSaved}
        onCancel={() => setView({ kind: 'list' })}
        onDuplicate={() => {
          // The concept already exists — switch the user to editing it instead.
          setView({ kind: 'list' });
          refresh();
        }}
      />
    );
  }
  if (view.kind === 'edit') {
    return (
      <CsConceptForm
        mode="edit"
        initial={view.concept}
        onSaved={handleSaved}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">CS Fundamentals</h2>
        <button
          type="button"
          onClick={() => setView({ kind: 'create' })}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add concept
        </button>
      </div>

      <CsSummaryPanel
        refreshKey={refreshKey}
        onOpenWeak={async (weak) => {
          const full = await loadConcept(weak.id);
          if (full) setView({ kind: 'edit', concept: full });
        }}
      />

      <CsFilterBar filters={filters} onChange={setFilters} />

      <CsConceptTable
        filters={filters}
        refreshKey={refreshKey}
        onEdit={(concept) => setView({ kind: 'edit', concept })}
        onArchive={(concept) => setPendingArchive(concept)}
        onChanged={refresh}
      />

      <ConfirmDialog
        open={pendingArchive !== null}
        title="Archive concept?"
        message={`This hides "${pendingArchive?.title ?? ''}" from your lists and summary. Its history is retained.`}
        confirmLabel="Archive"
        busy={archiving}
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      />
    </section>
  );
}
