import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { useApi } from '../utils.js';
import MessageForm from '../components/MessageForm.jsx';
import { ErrorBanner, Loading, useToast } from '../components/ui.jsx';

/** Create a new message (no :id in the URL) or edit an existing one. */
export default function EditMessage() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState(null);

  const { data, error, loading, reload } = useApi(
    () => Promise.all([api.listEmployees(), isNew ? null : api.getMessage(id)]),
    [id],
  );

  if (loading && !data) return <div className="page page-narrow"><Loading /></div>;
  if (!data) return <div className="page page-narrow"><ErrorBanner error={error} onRetry={reload} /></div>;

  const [employees, message] = data;
  const authorId = isNew ? user.id : message.author?.id;

  async function save(fields) {
    setBusy(true);
    setServerError(null);
    try {
      const body = { ...fields, author: { id: authorId } };
      const saved = isNew ? await api.createMessage(body) : await api.updateMessage(id, body);
      toast(isNew ? 'Message published.' : 'Changes saved.');
      navigate(`/manage/${saved.id}`);
    } catch (err) {
      setServerError(err);
      setBusy(false);
    }
  }

  return (
    <div className="page page-narrow">
      <Link to={isNew ? '/manage' : `/manage/${id}`} className="back-link">← Back</Link>
      <h1>{isNew ? 'New important message' : 'Edit message'}</h1>
      {!isNew && (
        <p className="muted">
          People who have already acknowledged keep their acknowledgement. Anyone newly added to the audience will be
          asked to acknowledge.
        </p>
      )}
      <MessageForm
        initial={message}
        employees={employees}
        authorId={authorId}
        submitLabel={isNew ? 'Publish message' : 'Save changes'}
        busy={busy}
        serverError={serverError}
        onSubmit={save}
        onCancel={() => navigate(isNew ? '/manage' : `/manage/${id}`)}
      />
    </div>
  );
}
