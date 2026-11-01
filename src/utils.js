import { useCallback, useEffect, useRef, useState } from 'react';

export const PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', hint: 'Action needed right away', rank: 0 },
  { value: 'HIGH', label: 'High', hint: 'Read today', rank: 1 },
  { value: 'NORMAL', label: 'Normal', hint: 'Read this week', rank: 2 },
  { value: 'LOW', label: 'Low', hint: 'For your information', rank: 3 },
];

export const priorityMeta = (value) => PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[2];

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
