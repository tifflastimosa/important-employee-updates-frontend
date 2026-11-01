import { formatDeadline, formatTimeLeft, timeLeft, urgencyOf, useNow } from '../utils.js';

/**
 * Small "Due Fri, Nov 6, 5:00 PM · 2d 4h left" chip.
 * Pass `live={false}` to show only the date (e.g. once the employee has acknowledged).
 */
export function DeadlineChip({ message, now, live = true }) {
  if (message.dueAt == null) {
    // Say so explicitly while action is still needed, so "no countdown" never looks like a bug.
    return live ? (
      <span className="deadline-chip deadline-muted">
        <ClockIcon /> No deadline
      </span>
    ) : null;
  }
  const date = formatDeadline(message.deadline);
  if (!live) {
    return (
      <span className="deadline-chip deadline-muted" title={`Deadline: ${date}`}>
        <ClockIcon /> Due {date}
      </span>
    );
  }
  const t = timeLeft(message.dueAt, now);
  return (
    <span className={`deadline-chip deadline-${urgencyOf(t)}`} title={`Deadline: ${date}`}>
      <ClockIcon /> <span className="deadline-chip-date">Due {date} ·</span> <strong>{formatTimeLeft(t)}</strong>
    </span>
  );
}

/** Large live countdown: days / hours / minutes / seconds, ticking every second. */
export function Countdown({ dueAt, label }) {
  const now = useNow(1000);
  const t = timeLeft(dueAt, now);
  const urgency = urgencyOf(t);
  const units = [
    ['days', t.days],
    ['hours', t.hours],
    ['minutes', t.minutes],
    ['seconds', t.seconds],
  ];
  return (
    <div className={`countdown countdown-${urgency}`} role="timer" aria-live="off">
      <span className="countdown-label">{t.overdue ? 'Overdue by' : label ?? 'Time left'}</span>
      <div className="countdown-units">
        {units.map(([unit, value]) => (
          <div key={unit} className="countdown-unit">
            <span className="countdown-value">{String(value).padStart(2, '0')}</span>
            <span className="countdown-unit-label">{unit}</span>
          </div>
        ))}
      </div>
      {/* Screen readers get one readable sentence instead of a ticking clock. */}
      <span className="visually-hidden">{formatTimeLeft(t)}</span>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="clock-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
