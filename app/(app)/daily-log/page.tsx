'use client';

import { useCallback, useState } from 'react';
import { DailyLogForm } from '@/components/DailyLogForm';
import { DailyLogList } from '@/components/DailyLogList';
import { DailyLogEntryView } from '@/components/DailyLogEntryView';
import type { DailyLogDTO } from '@/types';

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'view'; id: string }
  | { kind: 'edit'; entry: DailyLogDTO };

export default function DailyLogPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [refreshKey, setRefreshKey] = useState(0);

  const goList = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setView({ kind: 'list' });
  }, []);

  const handleSaved = useCallback((entry: DailyLogDTO) => {
    setRefreshKey((k) => k + 1);
    setView({ kind: 'view', id: entry.id });
  }, []);

  // On a duplicate-date create, route the user to edit the existing entry.
  const handleDuplicate = useCallback(async (date: string) => {
    const res = await fetch('/api/daily-log?limit=100');
    if (res.ok) {
      const body = await res.json();
      const match = (body.data.entries as DailyLogDTO[]).find((e) => e.date.slice(0, 10) === date);
      if (match) {
        setView({ kind: 'edit', entry: match });
        return;
      }
    }
    setView({ kind: 'list' });
  }, []);

  switch (view.kind) {
    case 'create':
      return (
        <DailyLogForm
          mode="create"
          onSaved={handleSaved}
          onCancel={goList}
          onDuplicate={handleDuplicate}
        />
      );
    case 'edit':
      return (
        <DailyLogForm
          mode="edit"
          initial={view.entry}
          onSaved={handleSaved}
          onCancel={() => setView({ kind: 'view', id: view.entry.id })}
        />
      );
    case 'view':
      return (
        <DailyLogEntryView
          id={view.id}
          onEdit={(entry) => setView({ kind: 'edit', entry })}
          onBack={goList}
        />
      );
    case 'list':
    default:
      return (
        <DailyLogList
          refreshKey={refreshKey}
          onSelect={(id) => setView({ kind: 'view', id })}
          onCreate={() => setView({ kind: 'create' })}
        />
      );
  }
}
