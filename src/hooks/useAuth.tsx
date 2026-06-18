import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSessionManager } from "./useSessionManager";
import { validateSessionSecurity } from "@/lib/sessionUtils";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session manager exactly once for the whole app.
  const { validateSession, updateActivity, cleanExpiredSession } = useSessionManager({
    checkInterval: 5,
    inactivityTimeout: 60,
    warningBeforeExpiry: 5,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && !validateSessionSecurity(session)) {
          console.warn('Invalid session detected, cleaning up');
          cleanExpiredSession();
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session) {
          updateActivity();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !validateSessionSecurity(session)) {
        console.warn('Invalid existing session detected, cleaning up');
        cleanExpiredSession();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        updateActivity();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        await cleanExpiredSession();
      }
    } catch (error) {
      console.error("Unexpected error during signout:", error);
      await cleanExpiredSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signOut, validateSession, updateActivity }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
