import { useMemo, useState } from 'react';
import { formatDeadline, localTimeZone, PRIORITIES, toLocalInput } from '../utils.js';

/** A date `daysAhead` days from now at `hour`:00 local time. */
function presetAt(daysAhead, hour = 17) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const DEADLINE_PRESETS = [
  { label: 'Today 11 PM', at: () => presetAt(0, 23) },
  { label: 'Tomorrow 5 PM', at: () => presetAt(1) },
  { label: 'In 3 days', at: () => presetAt(3) },
  { label: 'In 1 week', at: () => presetAt(7) },
];

/**
 * Create/edit form for an important message.
 * `employees` is used to list departments and preview how many people will receive it.
 */
export default function MessageForm({ initial, employees, authorId, submitLabel, busy, serverError, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'NORMAL');
  const [audience, setAudience] = useState(initial?.targetDepartments?.length ? 'departments' : 'everyone');
  const [departments, setDepartments] = useState(() => new Set(initial?.targetDepartments ?? []));
  const [touched, setTouched] = useState(false);
  // Kept as the <input type="datetime-local"> string. If the manager doesn't touch it we send the
  // original ISO value back unchanged, so an already-passed deadline can still be saved as-is.
  const initialDeadline = toLocalInput(initial?.deadline);
  const [deadlineInput, setDeadlineInput] = useState(initialDeadline);
  const deadlineChanged = deadlineInput !== initialDeadline;

  const allDepartments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees],
  );

  const recipients = useMemo(
    () =>
      employees.filter(
        (e) => e.id !== authorId && (audience === 'everyone' || departments.has(e.department)),
      ),
    [employees, authorId, audience, departments],
  );

  const errors = {
    title: !title.trim() && 'Give the message a title.',
    content: !content.trim() && 'Write the message.',
    departments: audience === 'departments' && departments.size === 0 && 'Pick at least one department.',
    deadline:
      deadlineChanged && deadlineInput && new Date(deadlineInput) <= new Date() && 'Pick a time in the future.',
  };
  const fieldErrors = serverError?.fieldErrors ?? {};
  const hasErrors = Object.values(errors).some(Boolean);

  function toggleDepartment(dept) {
    setDepartments((current) => {
      const next = new Set(current);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      priority,
      targetDepartments: audience === 'everyone' ? [] : [...departments],
      deadline: !deadlineChanged
        ? initial?.deadline ?? null
        : deadlineInput
          ? new Date(deadlineInput).toISOString()
          : null,
    });
  }

  const showError = (key) => (touched && errors[key]) || fieldErrors[key];

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          maxLength={140}
          placeholder="e.g. Updated Code of Conduct — please sign by Friday"
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(showError('title'))}
          autoFocus
        />
        {showError('title') && <p className="field-error">{showError('title')}</p>}
      </div>

      <fieldset className="field">
        <legend>Priority</legend>
        <div className="priority-picker">
          {PRIORITIES.map((p) => (
            <label key={p.value} className={`priority-option priority-${p.value.toLowerCase()} ${priority === p.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="priority"
                value={p.value}
                checked={priority === p.value}
                onChange={() => setPriority(p.value)}
              />
              <span className="priority-option-label">{p.label}</span>
              <span className="priority-option-hint">{p.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Acknowledge by <span className="muted optional">(optional)</span></legend>
        <div className="deadline-input-row">
          <input
            id="deadline"
            type="datetime-local"
            value={deadlineInput}
            min={toLocalInput(new Date())}
            onChange={(e) => setDeadlineInput(e.target.value)}
            aria-invalid={Boolean(showError('deadline'))}
            aria-describedby="deadline-hint"
          />
          {deadlineInput && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setDeadlineInput('')}>
              Remove deadline
            </button>
          )}
        </div>
        <div className="chip-group" role="group" aria-label="Quick deadlines">
          {DEADLINE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip chip-button"
              onClick={() => setDeadlineInput(toLocalInput(p.at()))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p id="deadline-hint" className="muted small field-hint">
          {deadlineInput
            ? `Employees will see a countdown to ${formatDeadline(new Date(deadlineInput))} (${localTimeZone()}).`
            : 'No deadline — employees won’t see a countdown.'}
        </p>
        {showError('deadline') && <p className="field-error">{showError('deadline')}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="content">Message</label>
        <textarea
          id="content"
          rows={8}
          value={content}
          placeholder="What do people need to know, and what do they need to do?"
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={Boolean(showError('content'))}
        />
        {showError('content') && <p className="field-error">{showError('content')}</p>}
      </div>

      <fieldset className="field">
        <legend>Who should receive it?</legend>
        <div className="segmented">
          <label className={audience === 'everyone' ? 'is-selected' : ''}>
            <input type="radio" name="audience" checked={audience === 'everyone'} onChange={() => setAudience('everyone')} />
            Everyone in the company
          </label>
          <label className={audience === 'departments' ? 'is-selected' : ''}>
            <input type="radio" name="audience" checked={audience === 'departments'} onChange={() => setAudience('departments')} />
            Specific departments
          </label>
        </div>

        {audience === 'departments' && (
          <div className="chip-group" role="group" aria-label="Departments">
            {allDepartments.length === 0 && <p className="muted">No departments found yet.</p>}
            {allDepartments.map((dept) => (
              <label key={dept} className={`chip ${departments.has(dept) ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={departments.has(dept)} onChange={() => toggleDepartment(dept)} />
                {dept}
              </label>
            ))}
          </div>
        )}
        {showError('departments') && <p className="field-error">{showError('departments')}</p>}

        <p className="recipient-preview">
          Will ask <strong>{recipients.length}</strong> {recipients.length === 1 ? 'person' : 'people'} to acknowledge
          {recipients.length > 0 && recipients.length <= 6 && (
            <span className="muted"> — {recipients.map((r) => r.fullName).join(', ')}</span>
          )}
        </p>
      </fieldset>

      {serverError && !Object.keys(fieldErrors).length && (
        <div className="error-banner" role="alert">
          {serverError.message}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
