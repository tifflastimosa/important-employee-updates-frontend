import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { ackCounts, audienceLabel, compareStores, formatDeadline, formatFull, useApi, useNow, withDueAt, workplaceLabel } from '../utils.js';
import { Countdown, DeadlineChip } from '../components/Deadline.jsx';
import { AckProgress, ConfirmDialog, ErrorBanner, Loading, PriorityBadge, useToast } from '../components/ui.jsx';

const byName = (a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '');
const NO_STORE = '__none__';
const storeKey = (e) => e.storeNumber || NO_STORE;

/** A manager's view of one message: content plus who has and hasn't acknowledged. */
export default function MessageStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: message, error, loading, reload } = useApi(() => api.getMessage(id).then((m) => withDueAt(m)), [id]);
  const now = useNow(30_000);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [store, setStore] = useState('ALL');

  if (loading && !message) return <div className="page"><Loading /></div>;
  if (!message) return <div className="page"><ErrorBanner error={error} onRetry={reload} /><BackLink /></div>;

  const allPending = message.notAcknowledgedBy ?? [];
  const allDone = message.acknowledgedBy ?? [];

  // Per-store breakdown so a store manager can follow up with just their store.
  const stores = [...new Set([...allPending, ...allDone].map(storeKey))]
    .sort((a, b) => (a === NO_STORE) - (b === NO_STORE) || compareStores(a, b))
    .map((key) => ({ key, waiting: allPending.filter((e) => storeKey(e) === key).length }));
  const inStore = (e) => store === 'ALL' || storeKey(e) === store;
  const pending = allPending.filter(inStore).sort(byName);
  const done = allDone.filter(inStore).sort(byName);

  async function copyEmails() {
    const emails = pending.map((e) => e.email).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      toast(`Copied ${pending.length} email address${pending.length === 1 ? '' : 'es'}.`);
    } catch {
      toast("Couldn't copy to the clipboard.", 'error');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMessage(message.id);
      toast(`Deleted “${message.title}”.`);
      navigate('/manage');
    } catch (err) {
      setDeleteError(err);
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <BackLink />

      <div className="status-layout">
        <article className={`message-detail priority-edge-${message.priority.toLowerCase()}`}>
          <div className="message-card-top">
            <PriorityBadge priority={message.priority} />
            <span className="muted small">To {audienceLabel(message)}</span>
            <div className="row-actions push-right">
              <Link to={`/manage/${message.id}/edit`} className="btn btn-small">Edit</Link>
              <button type="button" className="btn btn-small btn-ghost-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            </div>
          </div>
          <h1 className="message-detail-title">{message.title}</h1>
          <dl className="meta-row">
            <div><dt>From</dt><dd>{message.author?.fullName}</dd></div>
            <div><dt>Sent</dt><dd>{formatFull(message.createdAt)}</dd></div>
            <div>
              <dt>Deadline</dt>
              <dd>
                {message.deadline ? (
                  formatDeadline(message.deadline)
                ) : (
                  <>
                    <span className="muted">None</span> · <Link to={`/manage/${message.id}/edit`}>Add a deadline</Link>
                  </>
                )}
              </dd>
            </div>
            {message.updatedAt && message.updatedAt !== message.createdAt && (
              <div><dt>Last changed</dt><dd>{formatFull(message.updatedAt)}</dd></div>
            )}
          </dl>
          <div className="message-body">{message.content}</div>
        </article>

        <aside className="status-panel">
          <div className="status-summary">
            <h2 className="section-title">Acknowledgements</h2>
            <AckProgress message={message} />
            {message.dueAt != null && ackCounts(message).outstanding > 0 ? (
              <Countdown dueAt={message.dueAt} />
            ) : (
              <DeadlineChip message={message} now={now} live={ackCounts(message).outstanding > 0} />
            )}
            {stores.length > 1 && (
              <select value={store} onChange={(e) => setStore(e.target.value)} aria-label="Filter by store">
                <option value="ALL">All stores</option>
                {stores.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.key === NO_STORE ? 'No store set' : `Store ${s.key}`} — {s.waiting ? `${s.waiting} waiting` : 'all done'}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="btn btn-ghost btn-small" onClick={reload} disabled={loading}>
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>

          <section>
            <div className="list-heading">
              <h3>Waiting on ({pending.length})</h3>
              {pending.length > 0 && (
                <button type="button" className="btn btn-small" onClick={copyEmails} title="Copy their emails to send a reminder">
                  Copy emails
                </button>
              )}
            </div>
            {pending.length === 0 ? (
              <p className="muted small">{store === 'ALL' ? 'Everyone has acknowledged.' : 'Everyone at this store has acknowledged.'} 🎉</p>
            ) : (
              <PeopleList people={pending} />
            )}
          </section>

          <section>
            <div className="list-heading"><h3>Acknowledged ({done.length})</h3></div>
            {done.length === 0 ? <p className="muted small">No one yet.</p> : <PeopleList people={done} done />}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this message?"
        confirmLabel="Delete message"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>“{message.title}” will be removed for everyone, along with its acknowledgement record. This can’t be undone.</p>
        <ErrorBanner error={deleteError} />
      </ConfirmDialog>
    </div>
  );
}

function PeopleList({ people, done }) {
  return (
    <ul className="people-mini">
      {people.map((p) => (
        <li key={p.id}>
          <span className={`dot ${done ? 'dot-done' : 'dot-pending'}`} aria-hidden="true" />
          <span className="person-name">{p.fullName}</span>
          <span className="muted small">{workplaceLabel(p)}</span>
        </li>
      ))}
    </ul>
  );
}

function BackLink() {
  return <Link to="/manage" className="back-link">← All messages</Link>;
}
