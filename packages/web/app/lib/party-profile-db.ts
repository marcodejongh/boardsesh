import { v4 as uuidv4 } from 'uuid';
import { createIndexedDBStore, migrateFromLocalStorage } from './idb-helper';

const STORE_NAME = 'profile';
const PROFILE_KEY = 'party-profile';

// Legacy localStorage keys to migrate from
const LEGACY_USER_ID_KEY = 'boardsesh:userId';

export interface PartyProfile {
  id: string; // UUID, auto-generated
}

const getDB = createIndexedDBStore('boardsesh-party', STORE_NAME);

/**
 * Get the party profile from IndexedDB
 */
export const getPartyProfile = async (): Promise<PartyProfile | null> => {
  try {
    const db = await getDB();
    if (!db) return null;
    const profile = await db.get(STORE_NAME, PROFILE_KEY);
    if (profile) {
      // Return only the id field (ignore legacy username/avatarUrl if present)
      return { id: profile.id };
    }
    return null;
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
    const db = await getDB();
    if (!db) return;
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
    const db = await getDB();
    if (!db) return;
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
const migrateFromLegacyStorage = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const existingProfile = await getPartyProfile();
    if (existingProfile) {
      return false;
    }

    const migrated = await migrateFromLocalStorage<string>(
      LEGACY_USER_ID_KEY,
      async (legacyUserId) => {
        await savePartyProfile({ id: legacyUserId });
      },
    );

    if (migrated) {
      // Also clean up legacy username key if present
      localStorage.removeItem('boardsesh:username');
      console.log('Successfully migrated party profile from localStorage to IndexedDB');
    }

    return migrated;
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
    return false;
  }
};

/**
 * Ensure a user ID exists, creating a new profile if needed
 * This will migrate from localStorage if data exists there
 * Returns the profile with just an id
 */
export const ensurePartyProfile = async (): Promise<PartyProfile> => {
  try {
    // First, try to migrate from localStorage
    await migrateFromLegacyStorage();

    // Check for existing profile
    const existingProfile = await getPartyProfile();
    if (existingProfile) {
      return existingProfile;
    }

    // Create a new profile with just an ID
    const newProfile: PartyProfile = {
      id: uuidv4(),
    };

    await savePartyProfile(newProfile);
    return newProfile;
  } catch (error) {
    console.error('Failed to ensure party profile:', error);
    // Return a fallback in-memory profile
    return {
      id: uuidv4(),
    };
  }
};
