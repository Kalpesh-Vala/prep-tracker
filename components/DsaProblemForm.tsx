'use client';

import { useState, type FormEvent } from 'react';
import type { AttemptType, Difficulty, DsaProblemDTO } from '@/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DsaProblemFormProps {
  mode: 'create' | 'edit';
  initial?: DsaProblemDTO;
  onSaved: (problem: DsaProblemDTO) => void;
  onCancel: () => void;
}

interface FormState {
  title: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  platform: string;
  timeTakenMinutes: string;
  attemptType: AttemptType;
  solvedWithoutHints: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  confidence: string;
  needsRevision: boolean;
  interviewWorthy: boolean;
  solvedOn: string;
}

function initialState(initial?: DsaProblemDTO): FormState {
  return {
    title: initial?.title ?? '',
    topic: initial?.topic ?? '',
    subtopic: initial?.subtopic ?? '',
    difficulty: initial?.difficulty ?? 'medium',
    platform: initial?.platform ?? '',
    timeTakenMinutes: initial ? String(initial.timeTakenMinutes) : '',
    attemptType: initial?.attemptType ?? 'first_attempt',
    solvedWithoutHints: initial?.solvedWithoutHints ?? false,
    timeComplexity: initial?.timeComplexity ?? '',
    spaceComplexity: initial?.spaceComplexity ?? '',
    confidence: initial ? String(initial.confidence) : '3',
    needsRevision: initial?.needsRevision ?? false,
    interviewWorthy: initial?.interviewWorthy ?? false,
    solvedOn: initial ? initial.solvedOn.slice(0, 10) : todayISO(),
  };
}

function validate(s: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.title.trim()) e.title = 'Title is required.';
  if (!s.topic.trim()) e.topic = 'Topic is required.';
  if (!s.platform.trim()) e.platform = 'Platform is required.';
  if (!s.timeComplexity.trim()) e.timeComplexity = 'Time complexity is required.';
  if (!s.spaceComplexity.trim()) e.spaceComplexity = 'Space complexity is required.';

  const time = Number(s.timeTakenMinutes);
  if (s.timeTakenMinutes === '' || Number.isNaN(time)) e.timeTakenMinutes = 'Enter minutes.';
  else if (!Number.isInteger(time) || time < 1) e.timeTakenMinutes = 'Must be a whole number > 0.';

  const conf = Number(s.confidence);
  if (!Number.isInteger(conf) || conf < 1 || conf > 5) e.confidence = 'Confidence is 1–5.';

  if (!s.solvedOn) e.solvedOn = 'A date is required.';
  else if (s.solvedOn > todayISO()) e.solvedOn = 'Cannot be a future date.';

  return e;
}

export function DsaProblemForm({ mode, initial, onSaved, onCancel }: DsaProblemFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const found = validate(state);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      title: state.title.trim(),
      topic: state.topic.trim(),
      ...(state.subtopic.trim() ? { subtopic: state.subtopic.trim() } : {}),
      difficulty: state.difficulty,
      platform: state.platform.trim(),
      timeTakenMinutes: Number(state.timeTakenMinutes),
      attemptType: state.attemptType,
      solvedWithoutHints: state.solvedWithoutHints,
      timeComplexity: state.timeComplexity.trim(),
      spaceComplexity: state.spaceComplexity.trim(),
      confidence: Number(state.confidence),
      needsRevision: state.needsRevision,
      interviewWorthy: state.interviewWorthy,
      solvedOn: state.solvedOn,
    };

    setSubmitting(true);
    try {
      const res =
        mode === 'create'
          ? await fetch('/api/dsa', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/dsa/${initial!.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
      const body = await res.json();
      if (res.ok) {
        onSaved(body.data.problem as DsaProblemDTO);
        return;
      }
      setSubmitError(body.error?.message ?? 'Could not save. Please try again.');
    } catch {
      setSubmitError('Could not reach the server. Your input has not been lost — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-sm text-red-600">{errors[k]}</p> : null);
  const inputCls = 'mt-1 w-full rounded border border-gray-300 px-3 py-2';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h2 className="text-xl font-semibold">{mode === 'create' ? 'Add a problem' : 'Edit problem'}</h2>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input id="title" value={state.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
        {err('title')}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topic</label>
          <input id="topic" value={state.topic} onChange={(e) => update('topic', e.target.value)} className={inputCls} />
          {err('topic')}
        </div>
        <div>
          <label htmlFor="subtopic" className="block text-sm font-medium text-gray-700">Subtopic (optional)</label>
          <input id="subtopic" value={state.subtopic} onChange={(e) => update('subtopic', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
          <select id="difficulty" value={state.difficulty} onChange={(e) => update('difficulty', e.target.value as Difficulty)} className={inputCls}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700">Platform</label>
          <input id="platform" value={state.platform} onChange={(e) => update('platform', e.target.value)} className={inputCls} />
          {err('platform')}
        </div>
        <div>
          <label htmlFor="solvedOn" className="block text-sm font-medium text-gray-700">Solved on</label>
          <input id="solvedOn" type="date" max={todayISO()} value={state.solvedOn} onChange={(e) => update('solvedOn', e.target.value)} className={inputCls} />
          {err('solvedOn')}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="timeTakenMinutes" className="block text-sm font-medium text-gray-700">Time taken (min)</label>
          <input id="timeTakenMinutes" type="number" min={1} step={1} value={state.timeTakenMinutes} onChange={(e) => update('timeTakenMinutes', e.target.value)} className={inputCls} />
          {err('timeTakenMinutes')}
        </div>
        <div>
          <label htmlFor="attemptType" className="block text-sm font-medium text-gray-700">Attempt</label>
          <select id="attemptType" value={state.attemptType} onChange={(e) => update('attemptType', e.target.value as AttemptType)} className={inputCls}>
            <option value="first_attempt">First attempt</option>
            <option value="revisit">Revisit</option>
          </select>
        </div>
        <div>
          <label htmlFor="confidence" className="block text-sm font-medium text-gray-700">Confidence (1–5)</label>
          <select id="confidence" value={state.confidence} onChange={(e) => update('confidence', e.target.value)} className={inputCls}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {err('confidence')}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="timeComplexity" className="block text-sm font-medium text-gray-700">Time complexity</label>
          <input id="timeComplexity" value={state.timeComplexity} onChange={(e) => update('timeComplexity', e.target.value)} placeholder="O(n log n)" className={inputCls} />
          {err('timeComplexity')}
        </div>
        <div>
          <label htmlFor="spaceComplexity" className="block text-sm font-medium text-gray-700">Space complexity</label>
          <input id="spaceComplexity" value={state.spaceComplexity} onChange={(e) => update('spaceComplexity', e.target.value)} placeholder="O(1)" className={inputCls} />
          {err('spaceComplexity')}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={state.solvedWithoutHints} onChange={(e) => update('solvedWithoutHints', e.target.checked)} className="h-4 w-4" />
          Solved without hints
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={state.needsRevision} onChange={(e) => update('needsRevision', e.target.checked)} className="h-4 w-4" />
          Needs revision
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={state.interviewWorthy} onChange={(e) => update('interviewWorthy', e.target.checked)} className="h-4 w-4" />
          Interview-worthy
        </label>
      </div>

      {submitError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
      ) : null}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
