export interface SyncRunnerConfig {
  onLog?: (message: string) => void;
  onError?: (error: Error, context: { userId?: string; board?: string }) => void;
}

export interface SyncSummary {
  total: number;
  successful: number;
  failed: number;
  errors: SyncError[];
}

export interface SyncError {
  userId: string;
  boardType: string;
  error: string;
}

export interface CredentialRecord {
  userId: string;
  boardType: string;
  encryptedUsername: string | null;
  encryptedPassword: string | null;
  auroraUserId: number | null;
  auroraToken: string | null;
  syncStatus: string | null;
  syncError: string | null;
  lastSyncAt: Date | null;
}
