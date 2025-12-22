import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'boardsesh-party';
const DB_VERSION = 1;
const STORE_NAME = 'profile';
const PROFILE_KEY = 'party-profile';

// Legacy localStorage keys to migrate from
const LEGACY_USER_ID_KEY = 'boardsesh:userId';
const LEGACY_USERNAME_KEY = 'boardsesh:username';

export interface PartyProfile {
  id: string; // UUID, auto-generated
  username: string;
  avatarUrl?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = async (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Get the party profile from IndexedDB
 */
export const getPartyProfile = async (): Promise<PartyProfile | null> => {
  try {
    const db = await initDB();
    const profile = await db.get(STORE_NAME, PROFILE_KEY);
    return profile || null;
  } catch (error) {
    console.error('Failed to get party profile:', error);
    return null;
  }
};

/**
 * Save the party profile to IndexedDB
 */
export const savePartyProfile = async (profile: PartyProfile): Promise<void> => {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, profile, PROFILE_KEY);
  } catch (error) {
    console.error('Failed to save party profile:', error);
    throw error;
  }
};

/**
 * Clear the party profile from IndexedDB
 */
export const clearPartyProfile = async (): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, PROFILE_KEY);
  } catch (error) {
    console.error('Failed to clear party profile:', error);
    throw error;
  }
};

/**
 * Migrate data from legacy localStorage keys to IndexedDB
 * Returns true if migration was performed, false otherwise
 */
export const migrateFromLocalStorage = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check if we already have a profile
    const existingProfile = await getPartyProfile();
    if (existingProfile) {
      // Already migrated or profile exists
      return false;
    }

    // Check for legacy localStorage values
    const legacyUserId = localStorage.getItem(LEGACY_USER_ID_KEY);
    const legacyUsername = localStorage.getItem(LEGACY_USERNAME_KEY);

    if (legacyUserId || legacyUsername) {
      // Create new profile with migrated data
      const migratedProfile: PartyProfile = {
        id: legacyUserId || uuidv4(),
        username: legacyUsername || '',
      };

      await savePartyProfile(migratedProfile);

      // Clean up legacy localStorage
      localStorage.removeItem(LEGACY_USER_ID_KEY);
      localStorage.removeItem(LEGACY_USERNAME_KEY);

      console.log('Successfully migrated party profile from localStorage to IndexedDB');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
    return false;
  }
};

/**
 * Ensure a user ID exists, creating a new profile if needed
 * This will migrate from localStorage if data exists there
 * Returns the profile (may have empty username)
 */
export const ensurePartyProfile = async (): Promise<PartyProfile> => {
  try {
    // First, try to migrate from localStorage
    await migrateFromLocalStorage();

    // Check for existing profile
    const existingProfile = await getPartyProfile();
    if (existingProfile) {
      return existingProfile;
    }

    // Create a new profile with just an ID
    const newProfile: PartyProfile = {
      id: uuidv4(),
      username: '',
    };

    await savePartyProfile(newProfile);
    return newProfile;
  } catch (error) {
    console.error('Failed to ensure party profile:', error);
    // Return a fallback in-memory profile
    return {
      id: uuidv4(),
      username: '',
    };
  }
};

/**
 * Update just the username of the profile
 */
export const updateUsername = async (username: string): Promise<PartyProfile> => {
  const profile = await ensurePartyProfile();
  const updatedProfile: PartyProfile = {
    ...profile,
    username,
  };
  await savePartyProfile(updatedProfile);
  return updatedProfile;
};

/**
 * Update just the avatar URL of the profile
 */
export const updateAvatarUrl = async (avatarUrl: string): Promise<PartyProfile> => {
  const profile = await ensurePartyProfile();
  const updatedProfile: PartyProfile = {
    ...profile,
    avatarUrl,
  };
  await savePartyProfile(updatedProfile);
  return updatedProfile;
};
