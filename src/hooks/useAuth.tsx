import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSessionManager } from "./useSessionManager";
import { validateSessionSecurity } from "@/lib/sessionUtils";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session manager with security settings
  const { validateSession, updateActivity, cleanExpiredSession } = useSessionManager({
    checkInterval: 5, // Check every 5 minutes
    inactivityTimeout: 60, // 1 hour timeout
    warningBeforeExpiry: 5, // Warn 5 minutes before expiry
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Validate session security before setting state
        if (session && !validateSessionSecurity(session)) {
          console.warn('Invalid session detected, cleaning up');
          cleanExpiredSession();
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update activity when session changes
        if (session) {
          updateActivity();
        }
      }
    );

    // THEN check for existing session with security validation
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
  }, [validateSessionSecurity, cleanExpiredSession, updateActivity]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        // Force cleanup even if signOut fails
        await cleanExpiredSession();
      }
    } catch (error) {
      console.error("Unexpected error during signout:", error);
      await cleanExpiredSession();
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    validateSession,
    updateActivity,
  };
};