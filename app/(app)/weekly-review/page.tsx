'use client';

import { useCallback, useState } from 'react';
import { WeeklyReviewForm } from '@/components/WeeklyReviewForm';
import { WeeklyReviewList } from '@/components/WeeklyReviewList';
import { WeeklyReviewDetail } from '@/components/WeeklyReviewDetail';
import type { WeeklyReviewDTO } from '@/types';

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'view'; id: string }
  | { kind: 'edit'; review: WeeklyReviewDTO };

export default function WeeklyReviewPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [refreshKey, setRefreshKey] = useState(0);

  const goList = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setView({ kind: 'list' });
  }, []);

  const handleSaved = useCallback((review: WeeklyReviewDTO) => {
    setRefreshKey((k) => k + 1);
    setView({ kind: 'view', id: review.id });
  }, []);

  // On a duplicate-week create, route the user to edit the existing review.
  const handleDuplicate = useCallback(async (weekNumber: number) => {
    const res = await fetch('/api/weekly-review?limit=100');
    if (res.ok) {
      const body = await res.json();
      const match = (body.data.items as WeeklyReviewDTO[]).find((r) => r.weekNumber === weekNumber);
      if (match) {
        setView({ kind: 'edit', review: match });
        return;
      }
    }
    setView({ kind: 'list' });
  }, []);

  switch (view.kind) {
    case 'create':
      return (
        <WeeklyReviewForm mode="create" onSaved={handleSaved} onCancel={goList} onDuplicate={handleDuplicate} />
      );
    case 'edit':
      return (
        <WeeklyReviewForm
          mode="edit"
          initial={view.review}
          onSaved={handleSaved}
          onCancel={() => setView({ kind: 'view', id: view.review.id })}
        />
      );
    case 'view':
      return (
        <WeeklyReviewDetail
          id={view.id}
          onEdit={(review) => setView({ kind: 'edit', review })}
          onBack={goList}
        />
      );
    case 'list':
    default:
      return (
        <WeeklyReviewList
          refreshKey={refreshKey}
          onSelect={(id) => setView({ kind: 'view', id })}
          onCreate={() => setView({ kind: 'create' })}
        />
      );
  }
}
