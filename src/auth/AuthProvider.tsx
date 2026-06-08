import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSessionActive, login as dbLogin, logout as dbLogout } from '@/db/auth';

interface AuthContextValue {
  /** null while the persisted session is still loading. */
  authed: boolean | null;
  /** Returns true on success, false on bad credentials. */
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    isSessionActive().then((active) => mounted && setAuthed(active));
    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(email: string, password: string): Promise<boolean> {
    const ok = await dbLogin(email, password);
    if (ok) setAuthed(true);
    return ok;
  }

  async function signOut(): Promise<void> {
    await dbLogout();
    setAuthed(false);
  }

  return <AuthContext.Provider value={{ authed, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}