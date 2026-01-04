'use client';

import { useUser } from "@stackframe/stack";

/**
 * Authentication status type matching NextAuth's session status
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * User data matching the shape expected by the app
 */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Session-like object for compatibility with existing code
 */
export interface AuthSession {
  user: AuthUser;
}

/**
 * Return type matching useSession from next-auth/react
 */
export interface UseAuthReturn {
  data: AuthSession | null;
  status: AuthStatus;
  update: () => Promise<void>;
}

/**
 * Hook that provides authentication state using Stack Auth.
 *
 * This is a compatibility layer that maps Stack Auth's useUser to
 * the session interface used throughout the app.
 *
 * Usage:
 * ```
 * const { data: session, status } = useAuth();
 * if (status === 'authenticated') {
 *   console.log(session.user.email);
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const user = useUser();

  if (user === null) {
    // User is not logged in
    return {
      data: null,
      status: 'unauthenticated',
      update: async () => {},
    };
  }

  // User is logged in
  return {
    data: {
      user: {
        id: user.id,
        email: user.primaryEmail,
        name: user.displayName,
        image: user.profileImageUrl,
      },
    },
    status: 'authenticated',
    update: async () => {
      // Stack Auth handles session refresh automatically
    },
  };
}

/**
 * Helper hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const user = useUser();
  return user !== null;
}

/**
 * Helper hook to get the current user ID, or null if not authenticated
 */
export function useUserId(): string | null {
  const user = useUser();
  return user?.id ?? null;
}
