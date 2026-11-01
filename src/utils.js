import { useCallback, useEffect, useRef, useState } from 'react';

export const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', hint: 'Action needed right away', rank: 0 },
  { value: 'HIGH', label: 'High', hint: 'Read today', rank: 1 },
  { value: 'NORMAL', label: 'Normal', hint: 'Read this week', rank: 2 },
  { value: 'LOW', label: 'Low', hint: 'For your information', rank: 3 },
];

export const priorityMeta = (value) => PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[2];

/** "Store 0042", or null for employees created before store numbers existed. */
export const storeLabel = (employee) => (employee?.storeNumber ? `Store ${employee.storeNumber}` : null);

/** "Engineering · Store 0042" (skips whatever is missing). */
export const workplaceLabel = (employee) => [employee?.department, storeLabel(employee)].filter(Boolean).join(' · ');

/** Natural sort so "Store 9" comes before "Store 10" and "0042" keeps its place. */
export const compareStores = (a, b) => (a ?? '').localeCompare(b ?? '', undefined, { numeric: true });

export const canPublish = (employee) => employee?.role === 'MANAGER' || employee?.role === 'ADMIN';

/** Sort by priority (most urgent first), then newest first. */
export function byPriorityThenDate(a, b) {
  const diff = priorityMeta(a.priority).rank - priorityMeta(b.priority).rank;
  if (diff !== 0) return diff;
  return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
}

/** 'pending' | 'acknowledged' | 'none' (the employee is not asked to sign it). */
export function statusFor(message, employeeId) {
  if (message.acknowledgedBy?.some((e) => e.id === employeeId)) return 'acknowledged';
  if (message.notAcknowledgedBy?.some((e) => e.id === employeeId)) return 'pending';
  return 'none';
}

export function ackCounts(message) {
  const acknowledged = message.acknowledgedBy?.length ?? 0;
  const total = acknowledged + (message.notAcknowledgedBy?.length ?? 0);
  return { acknowledged, total, outstanding: total - acknowledged };
}

export const audienceLabel = (message) =>
  message.targetDepartments?.length ? [...message.targetDepartments].sort().join(', ') : 'Everyone';

export function matchesSearch(message, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [message.title, message.content, message.author?.fullName]
    .filter(Boolean)
    .some((text) => text.toLowerCase().includes(q));
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const seconds = Math.round((date - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 7) return relative.format(Math.round(seconds / 86400), 'day');
  return absolute.format(date);
}

export const formatFull = (iso) => (iso ? absolute.format(new Date(iso)) : '');

/* ---------- Deadlines ---------- */

const DAY_MS = 86_400_000;

/**
 * Adds `dueAt` (ms timestamp on this device's clock) to a message. When the server sends a
 * countdown we anchor on its secondsRemaining, so a wrong device clock can't skew the timer.
 */
export function withDueAt(message, receivedAt = Date.now()) {
  if (!message?.deadline) return { ...message, dueAt: null };
  const dueAt =
    typeof message.countdown?.secondsRemaining === 'number'
      ? receivedAt + message.countdown.secondsRemaining * 1000
      : Date.parse(message.deadline);
  return { ...message, dueAt };
}

export function timeLeft(dueAt, now) {
  const ms = dueAt - now;
  let s = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(s / 86400);
  s %= 86400;
  const hours = Math.floor(s / 3600);
  s %= 3600;
  return { ms, overdue: ms < 0, days, hours, minutes: Math.floor(s / 60), seconds: s % 60 };
}

export function formatTimeLeft(t) {
  let amount;
  if (t.days) amount = `${t.days}d ${t.hours}h`;
  else if (t.hours) amount = `${t.hours}h ${t.minutes}m`;
  else if (t.minutes) amount = `${t.minutes}m`;
  else return t.overdue ? 'Just overdue' : 'Less than a minute left';
  return t.overdue ? `Overdue by ${amount}` : `${amount} left`;
}

/** 'overdue' | 'soon' (under 24 hours) | 'later' */
export const urgencyOf = (t) => (t.overdue ? 'overdue' : t.ms < DAY_MS ? 'soon' : 'later');

/** Soonest deadline first (overdue ones first of all), no deadline last; ties by priority. */
export function byDeadlineThenPriority(a, b) {
  if (a.dueAt != null && b.dueAt != null && a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
  if ((a.dueAt == null) !== (b.dueAt == null)) return a.dueAt == null ? 1 : -1;
  return byPriorityThenDate(a, b);
}

/** Current time, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const deadlineFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
export const formatDeadline = (iso) => (iso ? deadlineFormat.format(new Date(iso)) : '');

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** ISO instant -> value for <input type="datetime-local"> in the user's time zone. */
export function toLocalInput(isoOrDate) {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Runs an async loader on mount and whenever deps change.
 * Returns { data, error, loading, reload, setData }. Stale responses are ignored.
 */
export function useApi(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const callId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const current = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await load();
      if (current === callId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (current === callId.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update }));
  }, []);

  return { ...state, reload, setData };
}
