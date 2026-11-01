import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { canPublish, useApi, workplaceLabel } from '../utils.js';
import { ErrorBanner } from '../components/ui.jsx';
import { COMPANY_NAME, LogoMark, Wordmark } from '../components/Logo.jsx';

const EMPTY_EMPLOYEE = {
  firstName: '',
  lastName: '',
  email: '',
  employeeNumber: '',
  department: '',
  storeNumber: '',
  jobTitle: '',
  role: 'EMPLOYEE',
};

// Prototype sign-in: the backend has no authentication yet, so we look the employee up by
// work email. Swap this for a real login endpoint once the backend supports one.
export default function SignIn() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const { data: employees, error: loadError, loading, reload } = useApi(() => api.listEmployees(), []);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [adding, setAdding] = useState(false);

  function enter(employee) {
    signIn(employee);
    navigate(canPublish(employee) ? '/manage' : '/inbox');
  }

  function submit(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) {
      setError('Enter your work email.');
      return;
    }
    const match = employees?.find((e) => e.email?.toLowerCase() === value);
    if (!match) {
      setError("We couldn't find a Summer Retail Group account with that email.");
      return;
    }
    enter(match);
  }

  const people = [...(employees ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="login">
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand-inner">
          <Wordmark size={44} subtitle={false} />
          <div className="login-brand-copy">
            <h2>Employee Message Hub</h2>
          </div>
        </div>
        <div className="login-sun" />
      </aside>

      <main className="login-main">
        <div className="login-panel">
          <div className="login-mobile-brand">
            <LogoMark size={40} />
          </div>
          <h1>Sign in</h1>
          <p className="muted">Welcome back to {COMPANY_NAME} Important Updates.</p>

          <ErrorBanner error={loadError} onRetry={reload} />

          <form className="login-form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@summerretailgroup.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'email-error' : undefined}
                autoFocus
              />
              {error && (
                <p id="email-error" className="field-error">
                  {error}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-large btn-block" disabled={loading}>
              {loading ? 'Connecting…' : 'Sign in'}
            </button>
          </form>

          <p className="login-help muted small">
            Trouble signing in? Contact your store manager or HR.
          </p>

          <section className="login-demo">
            <button
              type="button"
              className="login-demo-toggle"
              aria-expanded={showDemo}
              onClick={() => setShowDemo((v) => !v)}
            >
              <span className="tag">Prototype</span> Demo accounts &amp; setup
              <span className="login-demo-chevron" aria-hidden="true">{showDemo ? '▴' : '▾'}</span>
            </button>

            {showDemo && (
              <div className="login-demo-body">
                <p className="muted small">
                  There are no passwords yet. Pick an account to sign in as that person.
                </p>
                {people.length === 0 && !loading && <p className="muted small">No accounts yet — add one below.</p>}
                <ul className="people-list">
                  {people.map((e) => (
                    <li key={e.id}>
                      <button type="button" className="person" onClick={() => enter(e)}>
                        <span className="avatar" aria-hidden="true">
                          {e.firstName?.[0]}
                          {e.lastName?.[0]}
                        </span>
                        <span className="person-text">
                          <span className="person-name">{e.fullName}</span>
                          <span className="muted">{[e.jobTitle, workplaceLabel(e)].filter(Boolean).join(' · ')}</span>
                        </span>
                        {canPublish(e) && <span className="tag tag-role">{e.role.toLowerCase()}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {adding ? (
                  <NewEmployeeForm onCancel={() => setAdding(false)} onCreated={enter} />
                ) : (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setAdding(true)}>
                    + Add a person
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
        <footer className="login-footer muted small">© {new Date().getFullYear()} {COMPANY_NAME}</footer>
      </main>
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
        {field('department', 'Department', { required: true, placeholder: 'e.g. Store Operations' })}
        {field('storeNumber', 'Store number', { required: true, inputMode: 'numeric', placeholder: 'e.g. 0042' })}
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
          {busy ? 'Adding…' : 'Add and sign in'}
        </button>
      </div>
    </form>
  );
}
