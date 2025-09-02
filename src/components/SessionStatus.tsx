import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getTimeUntilExpiry } from '@/lib/sessionUtils';

interface SessionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const SessionStatus = ({ showDetails = false, compact = false }: SessionStatusProps) => {
  const { session, validateSession } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (!session?.expires_at) return;

    const updateTimer = () => {
      const remaining = getTimeUntilExpiry(session.expires_at);
      setTimeUntilExpiry(remaining);
      setIsValid(remaining > 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  const getStatusInfo = () => {
    if (!session) {
      return {
        status: 'Not Authenticated',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        color: 'text-destructive'
      };
    }

    if (timeUntilExpiry <= 5) {
      return {
        status: 'Expiring Soon',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        color: 'text-destructive'
      };
    }

    if (timeUntilExpiry <= 15) {
      return {
        status: 'Active (Warning)',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-warning'
      };
    }

    return {
      status: 'Active & Secure',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-success'
    };
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${Math.ceil(minutes)} minutes`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.ceil(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleRefreshSession = async () => {
    await validateSession();
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <StatusIcon size={12} />
        {statusInfo.status}
      </Badge>
    );
  }

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <StatusIcon size={16} className={statusInfo.color} />
        <span className="text-sm font-medium">{statusInfo.status}</span>
        {session && (
          <span className="text-xs text-muted-foreground">
            ({formatTime(timeUntilExpiry)} remaining)
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield size={18} />
          Session Security Status
        </CardTitle>
        <CardDescription>
          Real-time session monitoring and security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon size={16} className={statusInfo.color} />
            <span className="font-medium">{statusInfo.status}</span>
          </div>
          <Badge variant={statusInfo.variant}>{isValid ? 'Valid' : 'Invalid'}</Badge>
        </div>

        {session && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time remaining:</span>
              <span className="font-mono">{formatTime(timeUntilExpiry)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">User:</span>
              <span className="font-mono text-xs">{session.user?.email}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last refresh:</span>
              <span className="font-mono text-xs">
                {new Date(session.user?.updated_at || '').toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshSession}
            className="w-full"
          >
            Validate Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};