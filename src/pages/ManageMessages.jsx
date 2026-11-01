import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { ackCounts, audienceLabel, byPriorityThenDate, formatWhen, matchesSearch, PRIORITIES, useApi } from '../utils.js';
import { AckProgress, ConfirmDialog, EmptyState, ErrorBanner, Loading, PriorityBadge, useToast } from '../components/ui.jsx';

const SORTS = {
  priority: { label: 'Priority', fn: byPriorityThenDate },
  newest: { label: 'Newest', fn: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0) },
  outstanding: { label: 'Most outstanding', fn: (a, b) => ackCounts(b).outstanding - ackCounts(a).outstanding || byPriorityThenDate(a, b) },
};

export default function ManageMessages() {
  const { user } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useApi(() => api.listMessages(), []);
  const [priority, setPriority] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [mineOnly, setMineOnly] = useState(false);
  const [sort, setSort] = useState('priority');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const messages = data ?? [];
  const stats = useMemo(() => {
    const open = messages.filter((m) => ackCounts(m).outstanding > 0);
    return {
      total: messages.length,
      open: open.length,
      urgentOpen: open.filter((m) => m.priority === 'URGENT').length,
      waitingPeople: open.reduce((sum, m) => sum + ackCounts(m).outstanding, 0),
    };
  }, [messages]);

  const visible = messages
    .filter((m) => priority === 'ALL' || m.priority === priority)
    .filter((m) => {
      if (status === 'ALL') return true;
      const { outstanding } = ackCounts(m);
      return status === 'OPEN' ? outstanding > 0 : outstanding === 0;
    })
    .filter((m) => !mineOnly || m.author?.id === user.id)
    .filter((m) => matchesSearch(m, query))
    .sort(SORTS[sort].fn);

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMessage(toDelete.id);
      setData((list) => list.filter((m) => m.id !== toDelete.id));
      toast(`Deleted “${toDelete.title}”.`);
      setToDelete(null);
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Manage messages</h1>
          <p className="muted">Track who has acknowledged, and follow up where needed.</p>
        </div>
        <Link to="/manage/new" className="btn btn-primary">
          + New message
        </Link>
      </div>

      <div className="stats">
        <Stat label="Messages" value={stats.total} />
        <Stat label="Awaiting acknowledgement" value={stats.open} onClick={() => setStatus('OPEN')} />
        <Stat label="Urgent & still open" value={stats.urgentOpen} tone={stats.urgentOpen ? 'urgent' : null} onClick={() => { setStatus('OPEN'); setPriority('URGENT'); }} />
        <Stat label="Acknowledgements outstanding" value={stats.waitingPeople} />
      </div>

      <div className="toolbar">
        <div className="toolbar-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            <option value="OPEN">Awaiting acknowledgement</option>
            <option value="DONE">Fully acknowledged</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="ALL">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>Sort: {s.label}</option>
            ))}
          </select>
          <label className="toggle">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Only mine
          </label>
        </div>
        <input type="search" className="search" placeholder="Search messages" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <Loading />
      ) : visible.length === 0 ? (
        <EmptyState title={messages.length === 0 ? 'No messages yet' : 'No messages match these filters'}>
          {messages.length === 0 ? (
            <Link to="/manage/new" className="btn btn-primary">Create the first message</Link>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => { setPriority('ALL'); setStatus('ALL'); setMineOnly(false); setQuery(''); }}>
              Clear filters
            </button>
          )}
        </EmptyState>
      ) : (
        <ul className="card-list">
          {visible.map((m) => (
            <li key={m.id} className={`manage-row priority-edge-${m.priority.toLowerCase()}`}>
              <Link to={`/manage/${m.id}`} className="manage-row-main">
                <div className="message-card-top">
                  <PriorityBadge priority={m.priority} />
                  <span className="muted small">To {audienceLabel(m)}</span>
                </div>
                <h3 className="message-card-title">{m.title}</h3>
                <p className="muted small">
                  {m.author?.id === user.id ? 'You' : m.author?.fullName} · {formatWhen(m.createdAt)}
                </p>
              </Link>
              <div className="manage-row-side">
                <AckProgress message={m} compact />
                <div className="row-actions">
                  <button type="button" className="btn btn-small" onClick={() => navigate(`/manage/${m.id}/edit`)}>Edit</button>
                  <button type="button" className="btn btn-small btn-ghost-danger" onClick={() => { setDeleteError(null); setToDelete(m); }}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this message?"
        confirmLabel="Delete message"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          “{toDelete?.title}” will be removed for everyone, along with its acknowledgement record. This can’t be undone.
        </p>
        <ErrorBanner error={deleteError} />
      </ConfirmDialog>
    </div>
  );
}

function Stat({ label, value, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`stat ${tone ? `stat-${tone}` : ''} ${onClick ? 'is-clickable' : ''}`} onClick={onClick}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Tag>
  );
}
