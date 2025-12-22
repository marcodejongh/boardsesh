'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  PartyProfile,
  getPartyProfile,
  savePartyProfile,
  clearPartyProfile,
  ensurePartyProfile,
  updateUsername as dbUpdateUsername,
  updateAvatarUrl as dbUpdateAvatarUrl,
} from '@/app/lib/party-profile-db';

interface PartyProfileContextType {
  profile: PartyProfile | null;
  isLoading: boolean;
  hasProfile: boolean;
  hasUsername: boolean;
  setUsername: (username: string) => Promise<void>;
  setAvatarUrl: (avatarUrl: string) => Promise<void>;
  uploadAvatar: (file: File, backendUrl: string) => Promise<string>;
  clearProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PartyProfileContext = createContext<PartyProfileContextType | undefined>(undefined);

/**
 * Convert a WebSocket URL to HTTP URL for avatar upload
 * ws://host:port/graphql -> http://host:port
 * wss://host:port/graphql -> https://host:port
 */
const wsUrlToHttpUrl = (wsUrl: string): string => {
  try {
    const url = new URL(wsUrl);
    const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    return `${protocol}//${url.host}`;
  } catch {
    // Fallback: just replace ws with http
    return wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/graphql$/, '');
  }
};

export const PartyProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<PartyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        // This will migrate from localStorage if needed and create a profile if none exists
        const loadedProfile = await ensurePartyProfile();
        if (mounted) {
          setProfile(loadedProfile);
        }
      } catch (error) {
        console.error('Failed to load party profile:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const loadedProfile = await getPartyProfile();
      setProfile(loadedProfile);
    } catch (error) {
      console.error('Failed to refresh party profile:', error);
    }
  }, []);

  const setUsername = useCallback(async (username: string) => {
    setIsLoading(true);
    try {
      const updatedProfile = await dbUpdateUsername(username);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update username:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAvatarUrl = useCallback(async (avatarUrl: string) => {
    setIsLoading(true);
    try {
      const updatedProfile = await dbUpdateAvatarUrl(avatarUrl);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update avatar URL:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(
    async (file: File, backendUrl: string): Promise<string> => {
      if (!profile?.id) {
        throw new Error('No profile ID available');
      }

      // Convert WS URL to HTTP
      const httpBaseUrl = wsUrlToHttpUrl(backendUrl);

      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', profile.id);

      const response = await fetch(`${httpBaseUrl}/api/avatars`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to upload avatar');
      }

      const result = await response.json();

      // The backend returns a relative URL, we need to make it absolute
      const avatarUrl = `${httpBaseUrl}${result.avatarUrl}`;

      // Save the avatar URL to the profile
      await setAvatarUrl(avatarUrl);

      return avatarUrl;
    },
    [profile?.id, setAvatarUrl],
  );

  const clearProfileHandler = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearPartyProfile();
      // Create a new empty profile
      const newProfile = await ensurePartyProfile();
      setProfile(newProfile);
    } catch (error) {
      console.error('Failed to clear party profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasProfile = useMemo(() => !!profile?.id, [profile?.id]);
  const hasUsername = useMemo(() => !!profile?.username && profile.username.length > 0, [profile?.username]);

  const value = useMemo<PartyProfileContextType>(
    () => ({
      profile,
      isLoading,
      hasProfile,
      hasUsername,
      setUsername,
      setAvatarUrl,
      uploadAvatar,
      clearProfile: clearProfileHandler,
      refreshProfile,
    }),
    [profile, isLoading, hasProfile, hasUsername, setUsername, setAvatarUrl, uploadAvatar, clearProfileHandler, refreshProfile],
  );

  return <PartyProfileContext.Provider value={value}>{children}</PartyProfileContext.Provider>;
};

export const usePartyProfile = (): PartyProfileContextType => {
  const context = useContext(PartyProfileContext);
  if (!context) {
    throw new Error('usePartyProfile must be used within a PartyProfileProvider');
  }
  return context;
};

export type { PartyProfileContextType };
