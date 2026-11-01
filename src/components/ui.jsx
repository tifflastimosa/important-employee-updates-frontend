import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ackCounts, priorityMeta } from '../utils.js';

export function PriorityBadge({ priority }) {
  const meta = priorityMeta(priority);
  return (
    <span className={`badge priority-${meta.value.toLowerCase()}`} title={meta.hint}>
      {meta.label}
    </span>
  );
}

export function StatusPill({ status }) {
  if (status === 'pending') return <span className="pill pill-pending">Needs acknowledgement</span>;
  if (status === 'acknowledged') return <span className="pill pill-done">✓ Acknowledged</span>;
  return <span className="pill pill-info">For information</span>;
}

export function AckProgress({ message, compact = false }) {
  const { acknowledged, total } = ackCounts(message);
  const pct = total === 0 ? 100 : Math.round((acknowledged / total) * 100);
  const done = total > 0 && acknowledged === total;
  return (
    <div className={`progress ${compact ? 'progress-compact' : ''}`}>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={acknowledged}
        aria-label="Acknowledged"
      >
        <div className={`progress-fill ${done ? 'is-done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        {total === 0 ? 'No recipients' : `${acknowledged} of ${total} acknowledged`}
      </span>
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" aria-live="polite">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{error.message ?? String(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

/** A confirmation dialog built on the native <dialog> element. */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <h2 className="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, tone = 'success') => {
    clearTimeout(timer.current);
    setToast({ text, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.tone}`}>
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
