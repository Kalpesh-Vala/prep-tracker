'use client';

import { useState, type FormEvent } from 'react';
import type { DailyLogDTO, EnergyLevel } from '@/types';

const ENERGY_OPTIONS: { value: '' | EnergyLevel; label: string }[] = [
  { value: '', label: '— not recorded —' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DailyLogFormProps {
  mode: 'create' | 'edit';
  initial?: DailyLogDTO;
  onSaved: (entry: DailyLogDTO) => void;
  onCancel: () => void;
  onDuplicate?: (date: string) => void;
}

interface FormState {
  date: string;
  studyHours: string;
  summary: string;
  problemsSolved: string;
  revisionCompleted: boolean;
  biggestChallenge: string;
  nextDayGoal: string;
  energyLevel: '' | EnergyLevel;
}

function initialState(initial?: DailyLogDTO): FormState {
  return {
    date: initial ? initial.date.slice(0, 10) : todayISO(),
    studyHours: initial ? String(initial.studyHours) : '',
    summary: initial?.summary ?? '',
    problemsSolved: initial ? String(initial.problemsSolved) : '',
    revisionCompleted: initial?.revisionCompleted ?? false,
    biggestChallenge: initial?.biggestChallenge ?? '',
    nextDayGoal: initial?.nextDayGoal ?? '',
    energyLevel: initial?.energyLevel ?? '',
  };
}

function validate(state: FormState, mode: 'create' | 'edit'): Record<string, string> {
  const errors: Record<string, string> = {};

  const hours = Number(state.studyHours);
  if (state.studyHours === '' || Number.isNaN(hours)) {
    errors.studyHours = 'Enter study hours (0–24).';
  } else if (hours < 0 || hours > 24) {
    errors.studyHours = 'Study hours must be between 0 and 24.';
  } else if (Math.abs(hours * 10 - Math.round(hours * 10)) > 1e-9) {
    errors.studyHours = 'Use at most one decimal place.';
  }

  const problems = Number(state.problemsSolved);
  if (state.problemsSolved === '' || Number.isNaN(problems)) {
    errors.problemsSolved = 'Enter the number of problems solved.';
  } else if (!Number.isInteger(problems) || problems < 0) {
    errors.problemsSolved = 'Must be a whole number of 0 or more.';
  }

  if (!state.summary.trim()) errors.summary = 'Summary is required.';
  if (!state.biggestChallenge.trim()) errors.biggestChallenge = 'Biggest challenge is required.';
  if (!state.nextDayGoal.trim()) errors.nextDayGoal = 'Next-day goal is required.';

  if (mode === 'create') {
    if (!state.date) {
      errors.date = 'A date is required.';
    } else if (state.date > todayISO()) {
      errors.date = 'Cannot log a future date.';
    }
  }

  return errors;
}

export function DailyLogForm({ mode, initial, onSaved, onCancel, onDuplicate }: DailyLogFormProps) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setDuplicate(false);

    const found = validate(state, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      studyHours: Number(state.studyHours),
      summary: state.summary.trim(),
      problemsSolved: Number(state.problemsSolved),
      revisionCompleted: state.revisionCompleted,
      biggestChallenge: state.biggestChallenge.trim(),
      nextDayGoal: state.nextDayGoal.trim(),
    };

    setSubmitting(true);
    try {
      let res: Response;
      if (mode === 'create') {
        res = await fetch('/api/daily-log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...body,
            date: state.date,
            ...(state.energyLevel ? { energyLevel: state.energyLevel } : {}),
          }),
        });
      } else {
        res = await fetch(`/api/daily-log/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, energyLevel: state.energyLevel || null }),
        });
      }

      const payload = await res.json();
      if (res.ok) {
        onSaved(payload.data.entry as DailyLogDTO);
        return;
      }
      if (res.status === 409) {
        setDuplicate(true);
        setSubmitError(payload.error?.message ?? 'An entry for this date already exists.');
        return;
      }
      setSubmitError(payload.error?.message ?? 'Could not save the entry. Please try again.');
    } catch {
      setSubmitError('Could not reach the server. Your input has not been lost — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (key: string) =>
    errors[key] ? <p className="mt-1 text-sm text-red-600">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h2 className="text-xl font-semibold">
        {mode === 'create' ? 'Log a day' : `Edit ${state.date}`}
      </h2>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date
        </label>
        {mode === 'create' ? (
          <input
            id="date"
            type="date"
            max={todayISO()}
            value={state.date}
            onChange={(e) => update('date', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        ) : (
          <p className="mt-1 rounded bg-gray-100 px-3 py-2 text-gray-700">{state.date}</p>
        )}
        {fieldError('date')}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="studyHours" className="block text-sm font-medium text-gray-700">
            Study hours
          </label>
          <input
            id="studyHours"
            type="number"
            min={0}
            max={24}
            step={0.1}
            value={state.studyHours}
            onChange={(e) => update('studyHours', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          {fieldError('studyHours')}
        </div>

        <div>
          <label htmlFor="problemsSolved" className="block text-sm font-medium text-gray-700">
            DSA problems solved
          </label>
          <input
            id="problemsSolved"
            type="number"
            min={0}
            step={1}
            value={state.problemsSolved}
            onChange={(e) => update('problemsSolved', e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          {fieldError('problemsSolved')}
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
          What did you learn?
        </label>
        <textarea
          id="summary"
          rows={3}
          value={state.summary}
          onChange={(e) => update('summary', e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {fieldError('summary')}
      </div>

      <div>
        <label htmlFor="biggestChallenge" className="block text-sm font-medium text-gray-700">
          Biggest challenge
        </label>
        <textarea
          id="biggestChallenge"
          rows={2}
          value={state.biggestChallenge}
          onChange={(e) => update('biggestChallenge', e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {fieldError('biggestChallenge')}
      </div>

      <div>
        <label htmlFor="nextDayGoal" className="block text-sm font-medium text-gray-700">
          Goal for tomorrow
        </label>
        <textarea
          id="nextDayGoal"
          rows={2}
          value={state.nextDayGoal}
          onChange={(e) => update('nextDayGoal', e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {fieldError('nextDayGoal')}
      </div>

      <div className="flex items-center gap-3">
        <input
          id="revisionCompleted"
          type="checkbox"
          checked={state.revisionCompleted}
          onChange={(e) => update('revisionCompleted', e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="revisionCompleted" className="text-sm font-medium text-gray-700">
          Revision completed today
        </label>
      </div>

      <div>
        <label htmlFor="energyLevel" className="block text-sm font-medium text-gray-700">
          Energy level (optional)
        </label>
        <select
          id="energyLevel"
          value={state.energyLevel}
          onChange={(e) => update('energyLevel', e.target.value as '' | EnergyLevel)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        >
          {ENERGY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {submitError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
          {duplicate && onDuplicate ? (
            <button
              type="button"
              onClick={() => onDuplicate(state.date)}
              className="ml-2 font-medium underline"
            >
              Edit the existing entry
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
