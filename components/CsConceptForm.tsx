'use client';

import { useState, type FormEvent } from 'react';
import type { CsConceptDTO, CsDomain, CsStage } from '@/types';

const DOMAINS: CsDomain[] = ['DBMS', 'OS', 'NETWORKS', 'OOP'];
const STAGES: { value: CsStage; label: string }[] = [
  { value: 'learned', label: 'Learned' },
  { value: 'revised', label: 'Revised' },
  { value: 'can_explain', label: 'Can explain' },
  { value: 'interview_ready', label: 'Interview-ready' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CsConceptFormProps {
  mode: 'create' | 'edit';
  initial?: CsConceptDTO;
  onSaved: (concept: CsConceptDTO) => void;
  onCancel: () => void;
  onDuplicate?: () => void;
}

interface FormState {
  domain: CsDomain;
  title: string;
  subtopic: string;
  tags: string;
  stage: CsStage;
  confidence: string;
  lastRevisedAt: string;
  notes: string;
  interviewQuestionRefs: string;
}

function initialState(initial?: CsConceptDTO): FormState {
  return {
    domain: initial?.domain ?? 'DBMS',
    title: initial?.title ?? '',
    subtopic: initial?.subtopic ?? '',
    tags: initial ? initial.tags.join(', ') : '',
    stage: initial?.stage ?? 'learned',
    confidence: initial ? String(initial.confidence) : '3',
    lastRevisedAt: initial ? initial.lastRevisedAt.slice(0, 10) : todayISO(),
    notes: initial?.notes ?? '',
    interviewQuestionRefs: initial ? initial.interviewQuestionRefs.join('\n') : '',
  };
}

function validate(s: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s.title.trim()) e.title = 'Title is required.';
  const conf = Number(s.confidence);
  if (!Number.isInteger(conf) || conf < 1 || conf > 5) e.confidence = 'Confidence is 1–5.';
  if (!s.lastRevisedAt) e.lastRevisedAt = 'A date is required.';
  else if (s.lastRevisedAt > todayISO()) e.lastRevisedAt = 'Cannot be a future date.';
  return e;
}

export function CsConceptForm({ mode, initial, onSaved, onCancel, onDuplicate }: CsConceptFormProps) {
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
    const found = validate(state);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      domain: state.domain,
      title: state.title.trim(),
      ...(state.subtopic.trim() ? { subtopic: state.subtopic.trim() } : {}),
      tags: state.tags.split(',').map((t) => t.trim()).filter(Boolean),
      stage: state.stage,
      confidence: Number(state.confidence),
      lastRevisedAt: state.lastRevisedAt,
      ...(state.notes.trim() ? { notes: state.notes.trim() } : {}),
      interviewQuestionRefs: state.interviewQuestionRefs
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
    };

    setSubmitting(true);
    try {
      const res =
        mode === 'create'
          ? await fetch('/api/cs-fundamentals', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/cs-fundamentals/${initial!.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
      const body = await res.json();
      if (res.ok) {
        onSaved(body.data.concept as CsConceptDTO);
        return;
      }
      if (res.status === 409) {
        setDuplicate(true);
        setSubmitError(body.error?.message ?? 'This concept already exists.');
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
      <h2 className="text-xl font-semibold">{mode === 'create' ? 'Add a concept' : 'Edit concept'}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700">Domain</label>
          <select id="domain" value={state.domain} onChange={(e) => update('domain', e.target.value as CsDomain)} className={inputCls}>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700">Maturity stage</label>
          <select id="stage" value={state.stage} onChange={(e) => update('stage', e.target.value as CsStage)} className={inputCls}>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Concept title</label>
          <input id="title" value={state.title} onChange={(e) => update('title', e.target.value)} className={inputCls} />
          {err('title')}
        </div>
        <div>
          <label htmlFor="subtopic" className="block text-sm font-medium text-gray-700">Subtopic (optional)</label>
          <input id="subtopic" value={state.subtopic} onChange={(e) => update('subtopic', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="confidence" className="block text-sm font-medium text-gray-700">Confidence (1–5)</label>
          <select id="confidence" value={state.confidence} onChange={(e) => update('confidence', e.target.value)} className={inputCls}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {err('confidence')}
        </div>
        <div>
          <label htmlFor="lastRevisedAt" className="block text-sm font-medium text-gray-700">Last revised</label>
          <input id="lastRevisedAt" type="date" max={todayISO()} value={state.lastRevisedAt} onChange={(e) => update('lastRevisedAt', e.target.value)} className={inputCls} />
          {err('lastRevisedAt')}
        </div>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated, optional)</label>
        <input id="tags" value={state.tags} onChange={(e) => update('tags', e.target.value)} placeholder="theory, schema" className={inputCls} />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea id="notes" rows={3} value={state.notes} onChange={(e) => update('notes', e.target.value)} className={inputCls} />
      </div>

      <div>
        <label htmlFor="interviewQuestionRefs" className="block text-sm font-medium text-gray-700">Interview questions (one per line, optional)</label>
        <textarea id="interviewQuestionRefs" rows={2} value={state.interviewQuestionRefs} onChange={(e) => update('interviewQuestionRefs', e.target.value)} className={inputCls} />
      </div>

      {submitError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
          {duplicate && onDuplicate ? (
            <button type="button" onClick={onDuplicate} className="ml-2 font-medium underline">
              Update the existing concept
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
