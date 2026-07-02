'use client';

import { useState, type FormEvent } from 'react';
import type { WeeklyReviewDTO } from '@/types';

const TOTAL_WEEKS = 26;

interface WeeklyReviewFormProps {
  mode: 'create' | 'edit';
  initial?: WeeklyReviewDTO;
  onSaved: (review: WeeklyReviewDTO) => void;
  onCancel: () => void;
  onDuplicate?: (weekNumber: number) => void;
}

interface FormState {
  weekNumber: string;
  plannedWork: string;
  completedWork: string;
  totalStudyHours: string;
  problemsSolved: string;
  dsaAccuracyPercent: string;
  weakTopics: string;
  wins: string;
  nextWeekAdjustments: string;
  prefillSourceUsed: boolean;
}

function initialState(initial?: WeeklyReviewDTO): FormState {
  return {
    weekNumber: initial ? String(initial.weekNumber) : '1',
    plannedWork: initial?.plannedWork ?? '',
    completedWork: initial?.completedWork ?? '',
    totalStudyHours: initial ? String(initial.totalStudyHours) : '',
    problemsSolved: initial ? String(initial.problemsSolved) : '',
    dsaAccuracyPercent:
      initial && typeof initial.dsaAccuracyPercent === 'number'
        ? String(initial.dsaAccuracyPercent)
        : '',
    weakTopics: initial ? initial.weakTopics.join(', ') : '',
    wins: initial?.wins ?? '',
    nextWeekAdjustments: initial?.nextWeekAdjustments ?? '',
    prefillSourceUsed: initial?.prefillSourceUsed ?? false,
  };
}

function validate(s: FormState, mode: 'create' | 'edit'): Record<string, string> {
  const e: Record<string, string> = {};
  if (mode === 'create') {
    const wk = Number(s.weekNumber);
    if (!Number.isInteger(wk) || wk < 1 || wk > TOTAL_WEEKS) e.weekNumber = 'Week must be 1–26.';
  }
  if (!s.plannedWork.trim()) e.plannedWork = 'Planned work is required.';
  if (!s.completedWork.trim()) e.completedWork = 'Completed work is required.';
  if (!s.wins.trim()) e.wins = 'Wins are required.';
  if (!s.nextWeekAdjustments.trim()) e.nextWeekAdjustments = 'Adjustments are required.';

  const hours = Number(s.totalStudyHours);
  if (s.totalStudyHours === '' || Number.isNaN(hours) || hours < 0)
    e.totalStudyHours = 'Enter study hours (≥ 0).';

  const solved = Number(s.problemsSolved);
  if (s.problemsSolved === '' || !Number.isInteger(solved) || solved < 0)
    e.problemsSolved = 'Enter a whole number (≥ 0).';

  if (s.dsaAccuracyPercent !== '') {
    const acc = Number(s.dsaAccuracyPercent);
    if (Number.isNaN(acc) || acc < 0 || acc > 100) e.dsaAccuracyPercent = 'Accuracy is 0–100.';
  }
  return e;
}

export function WeeklyReviewForm({ mode, initial, onSaved, onCancel, onDuplicate }: WeeklyReviewFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePrefill() {
    setPrefillNote(null);
    setPrefilling(true);
    try {
      const res = await fetch(`/api/weekly-review/prefill?weekNumber=${Number(state.weekNumber)}`);
      const body = await res.json();
      if (!res.ok) {
        setPrefillNote(body.error?.message ?? 'Could not load suggestions.');
        return;
      }
      const d = body.data;
      setState((prev) => ({
        ...prev,
        totalStudyHours: String(d.suggestedTotalStudyHours),
        problemsSolved: String(d.suggestedDsaSolvedCount),
        weakTopics: d.suggestedWeakTopics.join(', '),
        prefillSourceUsed: true,
      }));
      setPrefillNote(
        d.coverage.hasData
          ? `Suggested from ${d.coverage.dailyLogCount} daily log(s) and ${d.coverage.dsaCount} DSA entr(ies). Success rate must be entered manually.`
          : 'No daily logs or DSA entries found for this week — suggestions are zero/empty.',
      );
    } catch {
      setPrefillNote('Could not reach the server for suggestions.');
    } finally {
      setPrefilling(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setDuplicate(false);
    const found = validate(state, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const common = {
      plannedWork: state.plannedWork.trim(),
      completedWork: state.completedWork.trim(),
      totalStudyHours: Number(state.totalStudyHours),
      problemsSolved: Number(state.problemsSolved),
      ...(state.dsaAccuracyPercent !== ''
        ? { dsaAccuracyPercent: Number(state.dsaAccuracyPercent) }
        : {}),
      weakTopics: state.weakTopics
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      wins: state.wins.trim(),
      nextWeekAdjustments: state.nextWeekAdjustments.trim(),
      prefillSourceUsed: state.prefillSourceUsed,
    };

    setSubmitting(true);
    try {
      const res =
        mode === 'create'
          ? await fetch('/api/weekly-review', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ ...common, weekNumber: Number(state.weekNumber) }),
            })
          : await fetch(`/api/weekly-review/${initial!.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(common),
            });
      const body = await res.json();
      if (res.ok) {
        onSaved(body.data.review as WeeklyReviewDTO);
        return;
      }
      if (res.status === 409) {
        setDuplicate(true);
        setSubmitError(body.error?.message ?? 'A review for this week already exists.');
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
      <h2 className="text-xl font-semibold">
        {mode === 'create' ? 'New weekly review' : `Edit week ${state.weekNumber}`}
      </h2>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="weekNumber" className="block text-sm font-medium text-gray-700">Week (1–26)</label>
          {mode === 'create' ? (
            <select id="weekNumber" value={state.weekNumber} onChange={(e) => update('weekNumber', e.target.value)} className={inputCls}>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Week {n}</option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded bg-gray-100 px-3 py-2 text-gray-700">Week {state.weekNumber}</p>
          )}
          {err('weekNumber')}
        </div>
        {mode === 'create' ? (
          <button type="button" onClick={handlePrefill} disabled={prefilling} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {prefilling ? 'Loading…' : 'Prefill from this week’s data'}
          </button>
        ) : null}
      </div>
      {prefillNote ? <p className="text-sm text-gray-500">{prefillNote}</p> : null}

      <div>
        <label htmlFor="plannedWork" className="block text-sm font-medium text-gray-700">Planned this week</label>
        <textarea id="plannedWork" rows={2} value={state.plannedWork} onChange={(e) => update('plannedWork', e.target.value)} className={inputCls} />
        {err('plannedWork')}
      </div>

      <div>
        <label htmlFor="completedWork" className="block text-sm font-medium text-gray-700">Actually completed</label>
        <textarea id="completedWork" rows={2} value={state.completedWork} onChange={(e) => update('completedWork', e.target.value)} className={inputCls} />
        {err('completedWork')}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="totalStudyHours" className="block text-sm font-medium text-gray-700">Study hours</label>
          <input id="totalStudyHours" type="number" min={0} step={0.1} value={state.totalStudyHours} onChange={(e) => update('totalStudyHours', e.target.value)} className={inputCls} />
          {err('totalStudyHours')}
        </div>
        <div>
          <label htmlFor="problemsSolved" className="block text-sm font-medium text-gray-700">Problems solved</label>
          <input id="problemsSolved" type="number" min={0} step={1} value={state.problemsSolved} onChange={(e) => update('problemsSolved', e.target.value)} className={inputCls} />
          {err('problemsSolved')}
        </div>
        <div>
          <label htmlFor="dsaAccuracyPercent" className="block text-sm font-medium text-gray-700">Success rate % (optional)</label>
          <input id="dsaAccuracyPercent" type="number" min={0} max={100} step={1} value={state.dsaAccuracyPercent} onChange={(e) => update('dsaAccuracyPercent', e.target.value)} className={inputCls} />
          {err('dsaAccuracyPercent')}
        </div>
      </div>

      <div>
        <label htmlFor="weakTopics" className="block text-sm font-medium text-gray-700">Weak topics (comma-separated, optional)</label>
        <input id="weakTopics" value={state.weakTopics} onChange={(e) => update('weakTopics', e.target.value)} placeholder="DP, Tries" className={inputCls} />
      </div>

      <div>
        <label htmlFor="wins" className="block text-sm font-medium text-gray-700">Wins</label>
        <textarea id="wins" rows={2} value={state.wins} onChange={(e) => update('wins', e.target.value)} className={inputCls} />
        {err('wins')}
      </div>

      <div>
        <label htmlFor="nextWeekAdjustments" className="block text-sm font-medium text-gray-700">Adjustments for next week</label>
        <textarea id="nextWeekAdjustments" rows={2} value={state.nextWeekAdjustments} onChange={(e) => update('nextWeekAdjustments', e.target.value)} className={inputCls} />
        {err('nextWeekAdjustments')}
      </div>

      {submitError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
          {duplicate && onDuplicate ? (
            <button type="button" onClick={() => onDuplicate(Number(state.weekNumber))} className="ml-2 font-medium underline">
              Edit the existing review
            </button>
          ) : null}
        </div>
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
