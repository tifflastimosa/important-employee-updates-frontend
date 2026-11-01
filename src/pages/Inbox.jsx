import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { byPriorityThenDate, formatWhen, matchesSearch, PRIORITIES, statusFor, useApi } from '../utils.js';
import { EmptyState, ErrorBanner, Loading, PriorityBadge, StatusPill } from '../components/ui.jsx';

const TABS = [
  { value: 'pending', label: 'Needs action' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'all', label: 'All' },
];

const STATUS_ORDER = { pending: 0, none: 1, acknowledged: 2 };

export default function Inbox() {
  const { user } = useSession();
  const { data, error, loading, reload } = useApi(() => api.messagesFor(user.id), [user.id]);
  const [tab, setTab] = useState('pending');
  const [priority, setPriority] = useState('ALL');
  const [query, setQuery] = useState('');

  const messages = useMemo(
    () => (data ?? []).map((m) => ({ ...m, myStatus: statusFor(m, user.id) })),
    [data, user.id],
  );

  const pending = messages.filter((m) => m.myStatus === 'pending');
  const urgentPending = pending.filter((m) => m.priority === 'URGENT' || m.priority === 'HIGH');
  const counts = {
    pending: pending.length,
    acknowledged: messages.filter((m) => m.myStatus === 'acknowledged').length,
    all: messages.length,
  };

  const visible = messages
    .filter((m) => tab === 'all' || m.myStatus === tab)
    .filter((m) => priority === 'ALL' || m.priority === priority)
    .filter((m) => matchesSearch(m, query))
    .sort((a, b) => (tab === 'all' ? STATUS_ORDER[a.myStatus] - STATUS_ORDER[b.myStatus] : 0) || byPriorityThenDate(a, b));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Hi, {user.firstName}</h1>
          <p className="muted">
            {loading && !data
              ? 'Checking your messages…'
              : pending.length === 0
                ? "You're all caught up. Nothing needs your acknowledgement."
                : `You have ${pending.length} message${pending.length === 1 ? '' : 's'} to acknowledge${
                    urgentPending.length ? `, ${urgentPending.length} high priority or urgent` : ''
                  }.`}
          </p>
        </div>
      </div>

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
            </button>
          ))}
        </div>
        <div className="toolbar-filters">
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
          {visible.map((m) => (
            <li key={m.id}>
              <Link
                to={`/inbox/${m.id}`}
                className={`message-card priority-edge-${m.priority.toLowerCase()} ${m.myStatus === 'pending' ? 'is-unread' : ''}`}
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
                <p className="muted small">From {m.author?.fullName ?? 'Unknown'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
