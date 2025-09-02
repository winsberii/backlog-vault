# Secure Session Management System

This document explains the comprehensive session management system that automatically handles user session security, validation, and cleanup.

## Features

✅ **Automatic Session Validation** - Periodically checks if sessions are still valid  
✅ **Inactivity Detection** - Signs out users after configured periods of inactivity  
✅ **Expiry Warnings** - Warns users before their session expires  
✅ **Security Validation** - Validates session integrity to prevent hijacking  
✅ **Browser Storage Cleanup** - Removes all auth-related data on sign out  
✅ **Configurable Settings** - Customize behavior for different environments  
✅ **Activity Tracking** - Monitors user interaction to maintain sessions  

## How It Works

### 1. Session Monitoring
The system runs background checks every few minutes to:
- Validate that the current session token hasn't expired
- Check if the session data is secure and hasn't been tampered with
- Warn users when their session is about to expire
- Automatically sign out users when sessions become invalid

### 2. Inactivity Detection
Tracks user activity through:
- Mouse movements and clicks
- Keyboard input
- Scrolling
- Touch interactions

Users are automatically signed out after a configured period of inactivity.

### 3. Security Validation
Each session is validated for:
- Proper JWT token format
- Required session properties
- Token expiration timestamps
- Overall session integrity

### 4. Storage Cleanup
When sessions expire or become invalid:
- Supabase auth tokens are cleared
- Local storage is cleaned of auth-related data
- Session storage is cleared
- Authentication cookies are removed

## Configuration

### Basic Usage

The system is already integrated into the `useAuth` hook with sensible defaults:

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, signOut } = useAuth();
  // Session management runs automatically in background
}
```

### Custom Configuration

You can customize the session manager behavior:

```tsx
import { useAuth } from '@/hooks/useAuth';
import { highSecurityConfig } from '@/lib/sessionConfig';

// In your main app component
const { user } = useAuth();
// Uses environment-appropriate config automatically

// For custom settings, modify the config in sessionConfig.ts
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `checkInterval` | 5 minutes | How often to validate sessions |
| `inactivityTimeout` | 60 minutes | Inactivity period before auto-logout |
| `warningBeforeExpiry` | 5 minutes | When to warn about session expiry |
| `clearStorageOnExpiry` | `true` | Clear browser storage on logout |
| `enableSecurityValidation` | `true` | Validate session security |
| `showSessionStatus` | `false` | Show session status in UI |

### Environment Configurations

#### Production (Default)
- Check every 5 minutes
- 1 hour inactivity timeout
- 5 minute expiry warning

#### High Security
- Check every 2 minutes  
- 30 minute inactivity timeout
- 3 minute expiry warning
- Enhanced activity tracking

#### Development
- Check every 10 minutes
- 2 hour inactivity timeout  
- 10 minute expiry warning
- Storage clearing disabled

## UI Components

### Session Status Display

Show session information to users:

```tsx
import { SessionStatus } from '@/components/SessionStatus';

// Compact badge
<SessionStatus compact />

// Simple status line
<SessionStatus />

// Detailed card with controls
<SessionStatus showDetails />
```

### Manual Session Validation

```tsx
import { useAuth } from '@/hooks/useAuth';

function SecurityPanel() {
  const { validateSession } = useAuth();
  
  const handleCheckSecurity = async () => {
    const isValid = await validateSession();
    console.log('Session valid:', isValid);
  };
}
```

## Security Best Practices

### 1. Token Refresh
- Sessions are automatically refreshed by Supabase
- Invalid refreshes trigger immediate logout
- Failed validation clears all session data

### 2. Activity Tracking
- Multiple event types tracked for activity
- Configurable sensitivity levels
- Prevents accidental timeouts during active use

### 3. Storage Security
- Comprehensive cleanup of auth data
- Domain-specific cookie clearing
- Prevents residual session artifacts

### 4. Validation Checks
- JWT format validation
- Required property verification
- Timestamp accuracy checks
- Integrity monitoring

## Troubleshooting

### Sessions Expiring Too Quickly
- Check `inactivityTimeout` in config
- Verify user activity is being detected
- Review `checkInterval` frequency

### Security Warnings
- Ensure proper HTTPS in production
- Check browser console for validation errors
- Verify Supabase project configuration

### Storage Not Clearing
- Check `clearStorageOnExpiry` setting
- Verify browser permissions
- Check for third-party cookie policies

### Activity Not Detected
- Review `activityEvents` configuration
- Check for event conflicts with other libraries
- Verify DOM event propagation

## Implementation Details

### Files Structure
```
src/
├── hooks/
│   ├── useAuth.tsx          # Enhanced auth hook with security
│   └── useSessionManager.tsx # Core session management logic
├── lib/
│   ├── sessionUtils.ts      # Storage cleanup utilities  
│   └── sessionConfig.ts     # Configuration management
├── components/
│   └── SessionStatus.tsx    # UI components for session info
└── SESSION_MANAGEMENT.md    # This documentation
```

### Integration Points
- **useAuth**: Main authentication hook with session management
- **useSessionManager**: Core background monitoring logic
- **sessionUtils**: Security and cleanup utilities
- **SessionStatus**: Optional UI components for session visibility

## Future Enhancements

Potential improvements for even stronger security:

- **Device Fingerprinting** - Detect suspicious device changes
- **Concurrent Session Limits** - Restrict multiple active sessions  
- **Geographic Validation** - Alert on location changes
- **Biometric Integration** - Additional authentication factors
- **Audit Logging** - Track all authentication events
- **Rate Limiting** - Prevent brute force attempts

## Support

For questions or issues with the session management system:

1. Check browser console for error messages
2. Review configuration in `sessionConfig.ts`  
3. Test with different security levels
4. Verify Supabase project settings
5. Check network connectivity for token refresh

The system is designed to fail securely - if there's any doubt about session validity, it will automatically sign out the user to protect their data.