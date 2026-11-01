import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { canPublish } from '../utils.js';

export default function Layout() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(null);

  // Refresh the "needs acknowledgement" badge whenever the user moves between pages.
  useEffect(() => {
    let cancelled = false;
    api
      .pendingMessagesFor(user.id)
      .then((list) => !cancelled && setPendingCount(list.length))
      .catch(() => !cancelled && setPendingCount(null));
    return () => {
      cancelled = true;
    };
  }, [user.id, location.pathname]);

  const isManager = canPublish(user);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">!</span>
            Important Updates
          </Link>

          <nav className="nav" aria-label="Main">
            <NavLink to="/inbox" className="nav-link">
              My inbox
              {pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </NavLink>
            {isManager && (
              <NavLink to="/manage" end className="nav-link">
                Manage messages
              </NavLink>
            )}
          </nav>

          <div className="topbar-right">
            {isManager && (
              <Link to="/manage/new" className="btn btn-primary btn-small">
                + New message
              </Link>
            )}
            <div className="user-chip" title={user.email}>
              <span className="avatar" aria-hidden="true">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </span>
              <span className="user-chip-text">
                <span className="user-name">{user.fullName}</span>
                <span className="user-meta">
                  {user.department} · {user.role.toLowerCase()}
                </span>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                signOut();
                navigate('/sign-in');
              }}
            >
              Switch user
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
