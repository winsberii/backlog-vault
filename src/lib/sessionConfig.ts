/**
 * Session Management Configuration
 * 
 * This file contains configuration options for the secure session management system.
 * Modify these values according to your application's security requirements.
 */

export interface SessionConfig {
  /** How often to check session validity (in minutes) */
  checkInterval: number;
  
  /** How long before user is signed out due to inactivity (in minutes) */
  inactivityTimeout: number;
  
  /** When to show expiry warning before session expires (in minutes) */
  warningBeforeExpiry: number;
  
  /** Whether to show session status in the UI */
  showSessionStatus: boolean;
  
  /** Events that count as user activity */
  activityEvents: string[];
  
  /** Whether to clear all browser storage on session expiry */
  clearStorageOnExpiry: boolean;
  
  /** Whether to validate session security (recommended: true) */
  enableSecurityValidation: boolean;
}

/**
 * Default session configuration
 * 
 * Production recommended settings:
 * - checkInterval: 5 minutes (balance between security and performance)
 * - inactivityTimeout: 60 minutes (1 hour for most web apps)
 * - warningBeforeExpiry: 5 minutes (gives user time to save work)
 */
export const defaultSessionConfig: SessionConfig = {
  checkInterval: 5,
  inactivityTimeout: 2880, // 2 days (2 * 24 * 60 minutes)
  warningBeforeExpiry: 5,
  showSessionStatus: false,
  activityEvents: [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ],
  clearStorageOnExpiry: true,
  enableSecurityValidation: true,
};

/**
 * High security configuration
 * For applications handling sensitive data
 */
export const highSecurityConfig: SessionConfig = {
  checkInterval: 2, // Check every 2 minutes
  inactivityTimeout: 30, // 30 minutes timeout
  warningBeforeExpiry: 3, // Warn 3 minutes before
  showSessionStatus: true,
  activityEvents: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus',
    'blur'
  ],
  clearStorageOnExpiry: true,
  enableSecurityValidation: true,
};

/**
 * Development configuration
 * More lenient settings for development
 */
export const developmentConfig: SessionConfig = {
  checkInterval: 10, // Check every 10 minutes
  inactivityTimeout: 120, // 2 hours timeout
  warningBeforeExpiry: 10, // Warn 10 minutes before
  showSessionStatus: true,
  activityEvents: [
    'mousedown',
    'keypress',
    'click'
  ],
  clearStorageOnExpiry: false,
  enableSecurityValidation: true,
};

/**
 * Get configuration based on environment
 */
export const getSessionConfig = (): SessionConfig => {
  // You can customize this logic based on your environment detection
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('preview');
  
  if (isDevelopment) {
    return developmentConfig;
  }
  
  return defaultSessionConfig;
};