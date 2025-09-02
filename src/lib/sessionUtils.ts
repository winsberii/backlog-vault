/**
 * Comprehensive browser storage cleanup utility
 * Removes all session-related data from various storage mechanisms
 */
export const clearBrowserStorage = (): void => {
  try {
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove Supabase auth tokens and any app-specific keys
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('token')) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('token')) {
          sessionKeysToRemove.push(key);
        }
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });

    // Clear cookies related to authentication
    clearAuthCookies();

    console.log('Browser storage cleared successfully');
  } catch (error) {
    console.error('Error clearing browser storage:', error);
  }
};

/**
 * Clear authentication-related cookies
 */
const clearAuthCookies = (): void => {
  try {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Clear cookies that might contain auth data
      if (name.includes('auth') || 
          name.includes('session') || 
          name.includes('token') ||
          name.startsWith('sb-')) {
        // Clear for current domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Clear for root domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        // Clear for parent domain if subdomain
        const domain = window.location.hostname;
        const parts = domain.split('.');
        if (parts.length > 2) {
          const parentDomain = parts.slice(-2).join('.');
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${parentDomain}`;
        }
      }
    });
  } catch (error) {
    console.error('Error clearing auth cookies:', error);
  }
};

/**
 * Check if a session token is expired based on its expiration timestamp
 */
export const isTokenExpired = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt;
};

/**
 * Get time remaining until token expiry in minutes
 */
export const getTimeUntilExpiry = (expiresAt: number): number => {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, (expiresAt - now) / 60);
};

/**
 * Security utility to detect potential session hijacking attempts
 */
export const validateSessionSecurity = (session: any): boolean => {
  try {
    // Basic checks for session integrity
    if (!session || typeof session !== 'object') {
      return false;
    }

    // Check for required session properties
    const requiredProps = ['access_token', 'refresh_token', 'user', 'expires_at'];
    for (const prop of requiredProps) {
      if (!session.hasOwnProperty(prop)) {
        console.warn(`Missing required session property: ${prop}`);
        return false;
      }
    }

    // Check token format (basic JWT structure validation)
    if (!isValidJWTFormat(session.access_token)) {
      console.warn('Invalid access token format');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating session security:', error);
    return false;
  }
};

/**
 * Basic JWT format validation
 */
const isValidJWTFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  return parts.length === 3; // JWT should have 3 parts separated by dots
};