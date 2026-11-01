import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { canPublish, useApi } from '../utils.js';
import { EmptyState, ErrorBanner, Loading } from '../components/ui.jsx';

const EMPTY_EMPLOYEE = {
  firstName: '',
  lastName: '',
  email: '',
  employeeNumber: '',
  department: '',
  jobTitle: '',
  role: 'EMPLOYEE',
};

export default function SignIn() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const { data: employees, error, loading, reload } = useApi(() => api.listEmployees(), []);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  function choose(employee) {
    signIn(employee);
    navigate(canPublish(employee) ? '/manage' : '/inbox');
  }

  const sorted = [...(employees ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName));
  const q = query.trim().toLowerCase();
  const visible = q
    ? sorted.filter((e) => [e.fullName, e.department, e.jobTitle, e.email].some((t) => t?.toLowerCase().includes(q)))
    : sorted;

  return (
    <div className="signin">
      <div className="signin-card">
        <div className="signin-header">
          <span className="brand-mark brand-mark-lg" aria-hidden="true">!</span>
          <h1>Important Updates</h1>
          <p className="muted">
            Choose who you are to continue. <span className="tag">Prototype</span> there are no passwords yet.
          </p>
        </div>

        <ErrorBanner error={error} onRetry={reload} />

        {loading && !employees ? (
          <Loading label="Loading people…" />
        ) : (
          <>
            {sorted.length > 6 && (
              <input
                type="search"
                className="search"
                placeholder="Search by name or department"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
            {sorted.length === 0 && !error && (
              <EmptyState title="No one here yet">Add the first person below to get started.</EmptyState>
            )}
            <ul className="people-list">
              {visible.map((e) => (
                <li key={e.id}>
                  <button type="button" className="person" onClick={() => choose(e)}>
                    <span className="avatar" aria-hidden="true">
                      {e.firstName?.[0]}
                      {e.lastName?.[0]}
                    </span>
                    <span className="person-text">
                      <span className="person-name">{e.fullName}</span>
                      <span className="muted">
                        {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {canPublish(e) && <span className="tag tag-role">{e.role.toLowerCase()}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="signin-footer">
          {adding ? (
            <NewEmployeeForm
              onCancel={() => setAdding(false)}
              onCreated={(employee) => {
                setAdding(false);
                choose(employee);
              }}
            />
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>
              + Add a person
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewEmployeeForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_EMPLOYEE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fieldErrors = error?.fieldErrors ?? {};

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await api.createEmployee(form));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => (
    <div className="field">
      <label htmlFor={`emp-${key}`}>{label}</label>
      <input id={`emp-${key}`} value={form[key]} onChange={set(key)} {...props} />
      {fieldErrors[key] && <p className="field-error">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <form className="form form-compact" onSubmit={submit}>
      <h2 className="section-title">Add a person</h2>
      <div className="grid-2">
        {field('firstName', 'First name', { required: true })}
        {field('lastName', 'Last name', { required: true })}
        {field('email', 'Work email', { type: 'email', required: true })}
        {field('employeeNumber', 'Employee number', { required: true })}
        {field('department', 'Department', { required: true, placeholder: 'e.g. Engineering' })}
        {field('jobTitle', 'Job title')}
      </div>
      <div className="field">
        <label htmlFor="emp-role">Role</label>
        <select id="emp-role" value={form.role} onChange={set('role')}>
          <option value="EMPLOYEE">Employee — receives messages</option>
          <option value="MANAGER">Manager — can also publish messages</option>
          <option value="ADMIN">Admin — can also publish messages</option>
        </select>
      </div>
      {error && !Object.keys(fieldErrors).length && <ErrorBanner error={error} />}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add and continue'}
        </button>
      </div>
    </form>
  );
}
