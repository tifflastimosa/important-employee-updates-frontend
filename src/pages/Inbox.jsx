import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import {
  byDeadlineThenPriority,
  byPriorityThenDate,
  formatDeadline,
  formatTimeLeft,
  formatWhen,
  matchesSearch,
  PRIORITIES,
  statusFor,
  timeLeft,
  useApi,
  useNow,
  withDueAt,
} from '../utils.js';
import { EmptyState, ErrorBanner, Loading, PriorityBadge, StatusPill } from '../components/ui.jsx';
import { Countdown, DeadlineChip } from '../components/Deadline.jsx';

const TABS = [
  { value: 'pending', label: 'Needs action' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'all', label: 'All' },
];

const SORTS = {
  deadline: { label: 'Due date', fn: byDeadlineThenPriority },
  priority: { label: 'Priority', fn: byPriorityThenDate },
};

const STATUS_ORDER = { pending: 0, none: 1, acknowledged: 2 };

export default function Inbox() {
  const { user } = useSession();
  const { data, error, loading, reload } = useApi(
    () => api.messagesFor(user.id).then((list) => list.map((m) => withDueAt(m))),
    [user.id],
  );
  const now = useNow(30_000); // chips only show minutes, so a 30s tick is plenty
  const [tab, setTab] = useState('pending');
  const [priority, setPriority] = useState('ALL');
  const [sort, setSort] = useState('deadline');
  const [query, setQuery] = useState('');

  const messages = useMemo(
    () => (data ?? []).map((m) => ({ ...m, myStatus: statusFor(m, user.id) })),
    [data, user.id],
  );

  const pending = messages.filter((m) => m.myStatus === 'pending');
  const overdue = pending.filter((m) => m.dueAt != null && m.dueAt < now);
  const nextDue = pending.filter((m) => m.dueAt != null).sort(byDeadlineThenPriority)[0];
  const counts = {
    pending: pending.length,
    acknowledged: messages.filter((m) => m.myStatus === 'acknowledged').length,
    all: messages.length,
  };

  const visible = messages
    .filter((m) => tab === 'all' || m.myStatus === tab)
    .filter((m) => priority === 'ALL' || m.priority === priority)
    .filter((m) => matchesSearch(m, query))
    .sort((a, b) => (tab === 'all' ? STATUS_ORDER[a.myStatus] - STATUS_ORDER[b.myStatus] : 0) || SORTS[sort].fn(a, b));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Hi, {user.firstName}</h1>
          <p className="muted">{summary({ loading: loading && !data, pending, overdue, nextDue, now })}</p>
        </div>
      </div>

      {nextDue && <NextDeadline message={nextDue} overdueCount={overdue.length} />}

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={`tab ${tab === t.value ? 'is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              <span className="tab-count">{counts[t.value]}</span>
              {t.value === 'pending' && overdue.length > 0 && (
                <span className="tab-count tab-count-overdue" title="Overdue">{overdue.length} overdue</span>
              )}
            </button>
          ))}
        </div>
        <div className="toolbar-filters">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>Sort: {s.label}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="ALL">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            className="search"
            placeholder="Search messages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <Loading />
      ) : visible.length === 0 ? (
        <EmptyState title={tab === 'pending' && !query && priority === 'ALL' ? 'Nothing to acknowledge 🎉' : 'No messages match'}>
          {tab === 'pending' && counts.all > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setTab('all')}>
              See all messages
            </button>
          )}
        </EmptyState>
      ) : (
        <ul className="card-list">
          {visible.map((m) => {
            const isOverdue = m.myStatus === 'pending' && m.dueAt != null && m.dueAt < now;
            return (
              <li key={m.id}>
                <Link
                  to={`/inbox/${m.id}`}
                  className={`message-card priority-edge-${m.priority.toLowerCase()} ${m.myStatus === 'pending' ? 'is-unread' : ''} ${isOverdue ? 'is-overdue' : ''}`}
                >
                  <div className="message-card-top">
                    <PriorityBadge priority={m.priority} />
                    <StatusPill status={m.myStatus} />
                    <span className="muted small push-right" title={m.createdAt}>
                      {formatWhen(m.createdAt)}
                    </span>
                  </div>
                  <h3 className="message-card-title">{m.title}</h3>
                  <p className="message-card-snippet">{m.content}</p>
                  <div className="message-card-bottom">
                    <span className="muted small">From {m.author?.fullName ?? 'Unknown'}</span>
                    <DeadlineChip message={m} now={now} live={m.myStatus === 'pending'} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function summary({ loading, pending, overdue, nextDue, now }) {
  if (loading) return 'Checking your messages…';
  if (pending.length === 0) return "You're all caught up. Nothing needs your acknowledgement.";
  const parts = [`You have ${pending.length} message${pending.length === 1 ? '' : 's'} to acknowledge`];
  if (overdue.length) parts.push(`${overdue.length} overdue`);
  else if (nextDue) parts.push(`next one due in ${formatTimeLeft(timeLeft(nextDue.dueAt, now)).replace(' left', '')}`);
  return parts.join(' — ') + '.';
}

function NextDeadline({ message, overdueCount }) {
  const isOverdue = message.dueAt < Date.now();
  return (
    <section className={`next-deadline ${isOverdue ? 'is-overdue' : ''}`} aria-labelledby="next-deadline-title">
      <div className="next-deadline-text">
        <span className="next-deadline-eyebrow">
          {isOverdue
            ? overdueCount > 1
              ? `Overdue · ${overdueCount} messages are past their deadline`
              : 'Overdue'
            : 'Next deadline'}
        </span>
        <h2 id="next-deadline-title" className="next-deadline-title">{message.title}</h2>
        <p className="muted small">
          <PriorityBadge priority={message.priority} /> Acknowledge by <strong>{formatDeadline(message.deadline)}</strong>
        </p>
        <Link to={`/inbox/${message.id}`} className="btn btn-primary">
          Read and acknowledge →
        </Link>
      </div>
      <Countdown dueAt={message.dueAt} />
    </section>
  );
}
