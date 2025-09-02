import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { clearBrowserStorage } from '@/lib/sessionUtils';
import { useToast } from '@/hooks/use-toast';
import { getSessionConfig, SessionConfig } from '@/lib/sessionConfig';

interface SessionManagerOptions extends Partial<SessionConfig> {
  // Allow overriding any config option
}

export const useSessionManager = (options: SessionManagerOptions = {}) => {
  // Get default config and merge with options
  const defaultConfig = getSessionConfig();
  const config = { ...defaultConfig, ...options };
  
  const {
    checkInterval,
    inactivityTimeout,
    warningBeforeExpiry,
    activityEvents,
    clearStorageOnExpiry,
    enableSecurityValidation
  } = config;

  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();
  const inactivityIntervalRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef<boolean>(false);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Clean expired session and clear browser storage
  const cleanExpiredSession = useCallback(async () => {
    try {
      console.log('Session expired or invalid, cleaning up...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all browser storage if configured to do so
      if (clearStorageOnExpiry) {
        clearBrowserStorage();
      }
      
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error during session cleanup:', error);
      // Force clear storage even if signOut fails (if configured)
      if (clearStorageOnExpiry) {
        clearBrowserStorage();
      }
    }
  }, [toast, clearStorageOnExpiry]);

  // Check if session is valid and not expired
  const validateSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('No valid session found');
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const tokenExpiry = session.expires_at;
      
      if (tokenExpiry && now >= tokenExpiry) {
        console.log('Token has expired');
        await cleanExpiredSession();
        return false;
      }

      // Check for expiry warning
      if (tokenExpiry && !warningShownRef.current) {
        const timeUntilExpiry = (tokenExpiry - now) / 60; // minutes
        
        if (timeUntilExpiry <= warningBeforeExpiry && timeUntilExpiry > 0) {
          warningShownRef.current = true;
          toast({
            title: "Session Expiring Soon",
            description: `Your session will expire in ${Math.ceil(timeUntilExpiry)} minutes.`,
            variant: "default",
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      await cleanExpiredSession();
      return false;
    }
  }, [cleanExpiredSession, warningBeforeExpiry, toast]);

  // Check for user inactivity
  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = (now - lastActivityRef.current) / 1000 / 60; // minutes

    if (timeSinceLastActivity >= inactivityTimeout) {
      console.log(`User inactive for ${timeSinceLastActivity} minutes, signing out...`);
      cleanExpiredSession();
    }
  }, [inactivityTimeout, cleanExpiredSession]);

  // Periodic session validation
  const startSessionMonitoring = useCallback(() => {
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
    }

    // Set up session validation interval
    intervalRef.current = setInterval(async () => {
      await validateSession();
    }, checkInterval * 60 * 1000); // Convert to milliseconds

    // Set up inactivity check interval (check every minute)
    inactivityIntervalRef.current = setInterval(() => {
      checkInactivity();
    }, 60 * 1000);

    // Initial validation
    validateSession();
  }, [checkInterval, validateSession, checkInactivity]);

  const stopSessionMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      inactivityIntervalRef.current = undefined;
    }
  }, []);

  // Set up activity listeners
  useEffect(() => {
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [updateActivity, activityEvents]);

  // Set up auth state listener to start/stop monitoring
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // User is authenticated, start monitoring
        updateActivity();
        startSessionMonitoring();
      } else {
        // User is not authenticated, stop monitoring
        stopSessionMonitoring();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSessionMonitoring();
    };
  }, [startSessionMonitoring, stopSessionMonitoring, updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSessionMonitoring();
    };
  }, [stopSessionMonitoring]);

  return {
    validateSession,
    updateActivity,
    cleanExpiredSession,
  };
};