import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useSession } from './session.jsx';
import { canPublish } from './utils.js';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import SignIn from './pages/SignIn.jsx';
import Inbox from './pages/Inbox.jsx';
import MessageView from './pages/MessageView.jsx';
import ManageMessages from './pages/ManageMessages.jsx';
import MessageStatus from './pages/MessageStatus.jsx';
import EditMessage from './pages/EditMessage.jsx';

function RequireUser() {
  const { user, restoring } = useSession();
  const location = useLocation();
  if (restoring) return <Loading label="Signing you in…" />;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location }} />;
  return <Outlet />;
}

function RequireManager() {
  const { user } = useSession();
  return canPublish(user) ? <Outlet /> : <Navigate to="/inbox" replace />;
}

function Home() {
  const { user } = useSession();
  return <Navigate to={canPublish(user) ? '/manage' : '/inbox'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route element={<RequireUser />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="inbox/:id" element={<MessageView />} />
          <Route path="manage" element={<RequireManager />}>
            <Route index element={<ManageMessages />} />
            <Route path="new" element={<EditMessage key="new" />} />
            <Route path=":id" element={<MessageStatus />} />
            <Route path=":id/edit" element={<EditMessage key="edit" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
