'use client';

import { useNotificationSubscription } from '@/app/hooks/use-notification-subscription';

/**
 * Lightweight component that sets up the real-time notification subscription.
 * Replaces the full NotificationProvider — all notification state is now
 * managed by TanStack Query hooks.
 */
export function NotificationSubscriptionManager({ children }: { children: React.ReactNode }) {
  useNotificationSubscription();
  return children;
}
