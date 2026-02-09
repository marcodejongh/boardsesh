import { getPreference, setPreference, removePreference } from './user-preferences-db';

const KEY = 'lastUsedBoard';
const LEGACY_COOKIE_NAME = 'default_board_url';

export interface LastUsedBoardData {
  url: string;
  boardName: string;
  layoutName: string;
  sizeName: string;
  sizeDescription?: string;
  setNames: string[];
  angle: number;
}

let migrationDone = false;

export const getLastUsedBoard = async (): Promise<LastUsedBoardData | null> => {
  try {
    const stored = await getPreference<LastUsedBoardData>(KEY);
    if (stored) return stored;

    // One-time migration from default_board_url cookie
    if (!migrationDone && typeof document !== 'undefined') {
      migrationDone = true;
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === LEGACY_COOKIE_NAME && value) {
          const url = decodeURIComponent(value);
          // We only have the URL from the cookie, not the full metadata.
          // Store a partial record so at least the URL is preserved.
          const partial: LastUsedBoardData = {
            url,
            boardName: '',
            layoutName: '',
            sizeName: '',
            setNames: [],
            angle: 0,
          };
          await setPreference(KEY, partial);
          // Delete the cookie
          document.cookie = `${LEGACY_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
          return partial;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get last used board:', error);
    return null;
  }
};

export const setLastUsedBoard = async (data: LastUsedBoardData): Promise<void> => {
  try {
    await setPreference(KEY, data);
  } catch (error) {
    console.error('Failed to set last used board:', error);
  }
};

export const clearLastUsedBoard = async (): Promise<void> => {
  try {
    await removePreference(KEY);
  } catch (error) {
    console.error('Failed to clear last used board:', error);
  }
};
