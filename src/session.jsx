import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

// Prototype "sign in": the backend has no authentication yet, so the user picks who
// they are and we remember the employee id in localStorage.
const STORAGE_KEY = 'importantUpdates.employeeId';

const SessionContext = createContext(null);

function readStoredId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode); the session just won't survive a reload.
  }
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(() => Boolean(readStoredId()));

  useEffect(() => {
    const storedId = readStoredId();
    if (!storedId) return;
    api
      .getEmployee(storedId)
      .then(setUser)
      .catch(() => writeStoredId(null))
      .finally(() => setRestoring(false));
  }, []);

  const signIn = useCallback((employee) => {
    writeStoredId(employee.id);
    setUser(employee);
  }, []);

  const signOut = useCallback(() => {
    writeStoredId(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, restoring, signIn, signOut, setUser }), [user, restoring, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
