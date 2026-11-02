import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { audienceLabel, formatDeadline, formatFull, priorityMeta, statusFor, useApi, withDueAt } from '../utils.js';
import { Countdown } from '../components/Deadline.jsx';
import { ErrorBanner, Loading, PriorityBadge, StatusPill, useToast } from '../components/ui.jsx';

/** An employee reading a message and acknowledging it. */
export default function MessageView() {
  const { id } = useParams();
  const { user, setUser } = useSession();
  const toast = useToast();
  const { data: message, error, loading, reload, setData } = useApi(() => api.getMessage(id).then((m) => withDueAt(m)), [id]);
  const [confirmedRead, setConfirmedRead] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ackError, setAckError] = useState(null);

  if (loading && !message) return <div className="page"><Loading /></div>;
  if (!message) return <div className="page"><ErrorBanner error={error} onRetry={reload} /><BackLink /></div>;

  const status = statusFor(message, user.id);
  const needsConsent = !user.agreedToElectronicSignature;
  const canSubmit = confirmedRead && (!needsConsent || consent) && !busy;

  async function acknowledge() {
    setBusy(true);
    setAckError(null);
    try {
      if (needsConsent) {
        const { employeeNumber, firstName, lastName, email, department, storeNumber, jobTitle, role } = user;
        const updated = await api.updateEmployee(user.id, {
          employeeNumber, firstName, lastName, email, department, storeNumber, jobTitle, role,
          agreedToElectronicSignature: true,
        });
        setUser(updated);
      }
      setData(withDueAt(await api.acknowledge(message.id, user.id)));
      toast('Thanks — your acknowledgement was recorded.');
    } catch (err) {
      setAckError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-narrow">
      <BackLink />

      <article className={`message-detail priority-edge-${message.priority.toLowerCase()}`}>
        <div className="message-card-top">
          <PriorityBadge priority={message.priority} />
          <StatusPill status={status} />
        </div>
        <h1 className="message-detail-title">{message.title}</h1>
        <dl className="meta-row">
          <div>
            <dt>From</dt>
            <dd>{message.author?.fullName ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Sent</dt>
            <dd>{formatFull(message.createdAt)}</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>{audienceLabel(message)}</dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd className={message.deadline ? '' : 'muted'}>
              {message.deadline ? formatDeadline(message.deadline) : 'No deadline'}
            </dd>
          </div>
        </dl>
        <div className="message-body">{message.content}</div>
      </article>

      {status === 'pending' && (
        <section className={`ack-panel priority-${message.priority.toLowerCase()}-soft`} aria-labelledby="ack-heading">
          <div className="ack-panel-head">
            <div>
              <h2 id="ack-heading" className="section-title">Acknowledge this message</h2>
              <p className="muted small">
                {message.deadline ? (
                  <>Please acknowledge by <strong>{formatDeadline(message.deadline)}</strong>. </>
                ) : (
                  <>{priorityMeta(message.priority).hint}. </>
                )}
                Your manager can see who has acknowledged.
              </p>
            </div>
            {message.dueAt != null ? (
              <Countdown dueAt={message.dueAt} label="Time left to acknowledge" />
            ) : (
              <span className="no-deadline">No deadline set</span>
            )}
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={confirmedRead} onChange={(e) => setConfirmedRead(e.target.checked)} />
            I have read and understood this message.
          </label>
          {needsConsent && (
            <label className="checkbox">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I agree to sign documents electronically. (You only need to agree once.)
            </label>
          )}
          <ErrorBanner error={ackError} />
          <button type="button" className="btn btn-primary btn-large" disabled={!canSubmit} onClick={acknowledge}>
            {busy ? 'Recording…' : 'Acknowledge'}
          </button>
        </section>
      )}

      {status === 'acknowledged' && (
        <section className="ack-done">
          <span className="ack-done-icon" aria-hidden="true">✓</span>
          <div>
            <strong>You've acknowledged this message.</strong>
            <p className="muted small">
              Nothing else to do here.
              {message.deadline && <> The deadline was {formatDeadline(message.deadline)}.</>}
            </p>
          </div>
        </section>
      )}

      {status === 'none' && (
        <p className="muted small note">
          {message.author?.id === user.id
            ? 'You sent this message, so you are not asked to acknowledge it.'
            : 'This message is for your information. You were not on the list of people asked to acknowledge it.'}
        </p>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/inbox" className="back-link">
      ← Back to inbox
    </Link>
  );
}
