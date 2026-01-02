import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import ws from 'ws';

import { auroraCredentials } from '@boardsesh/db/schema/auth';
import { syncUserData } from '../sync/user-sync';
import { AuroraClimbingClient } from '../api/aurora-client';
import { decrypt, encrypt } from '@boardsesh/crypto';
import type { AuroraBoardName } from '../api/types';
import type { SyncRunnerConfig, SyncSummary, CredentialRecord } from './types';

// Configure WebSocket constructor for Node.js environment
neonConfig.webSocketConstructor = ws;

/**
 * Create a fresh pool for each operation to avoid stale WebSocket connections
 */
function createFreshPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return new Pool({
    connectionString,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000, // Short idle timeout to avoid stale connections
    max: 5,
  });
}

/**
 * Create HTTP-based Drizzle instance for simple queries (no transactions needed)
 */
function createHttpDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  const sql = neon(connectionString);
  return drizzleHttp({ client: sql });
}

export class SyncRunner {
  private config: SyncRunnerConfig;

  constructor(config: SyncRunnerConfig = {}) {
    this.config = config;
  }

  private log(message: string): void {
    if (this.config.onLog) {
      this.config.onLog(message);
    } else {
      console.log(message);
    }
  }

  private handleError(error: Error, context: { userId?: string; board?: string }): void {
    if (this.config.onError) {
      this.config.onError(error, context);
    } else {
      console.error(`[SyncRunner] Error:`, error, context);
    }
  }

  /**
   * Sync all users with active credentials
   */
  async syncAllUsers(): Promise<SyncSummary> {
    const results: SyncSummary = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Get credentials list using HTTP (simple query, no transaction needed)
    const credentials = await this.getActiveCredentials();
    results.total = credentials.length;

    this.log(`[SyncRunner] Found ${credentials.length} users with Aurora credentials to sync`);

    // Sync each user sequentially with fresh connection per user
    for (const cred of credentials) {
      try {
        await this.syncSingleCredential(cred);
        results.successful++;
        this.log(`[SyncRunner] ✓ Successfully synced user ${cred.userId} for ${cred.boardType}`);
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          userId: cred.userId,
          boardType: cred.boardType,
          error: errorMsg,
        });
        this.handleError(error instanceof Error ? error : new Error(errorMsg), {
          userId: cred.userId,
          board: cred.boardType,
        });
        this.log(`[SyncRunner] ✗ Failed to sync user ${cred.userId} for ${cred.boardType}: ${errorMsg}`);
      }
    }

    return results;
  }

  /**
   * Sync a specific user by NextAuth userId and board type
   */
  async syncUser(userId: string, boardType: string): Promise<void> {
    // Use HTTP for simple lookup query
    const db = createHttpDb();
    const credentials = await db
      .select()
      .from(auroraCredentials)
      .where(and(eq(auroraCredentials.userId, userId), eq(auroraCredentials.boardType, boardType)))
      .limit(1);

    if (credentials.length === 0) {
      throw new Error(`No credentials found for user ${userId} on ${boardType}`);
    }

    const cred = credentials[0] as CredentialRecord;
    await this.syncSingleCredential(cred);
  }

  private async getActiveCredentials(): Promise<CredentialRecord[]> {
    // Use HTTP for simple lookup query (no transaction needed)
    const db = createHttpDb();
    const credentials = await db
      .select()
      .from(auroraCredentials)
      .where(
        and(
          or(eq(auroraCredentials.syncStatus, 'active'), eq(auroraCredentials.syncStatus, 'error')),
          isNotNull(auroraCredentials.encryptedUsername),
          isNotNull(auroraCredentials.encryptedPassword),
          isNotNull(auroraCredentials.auroraUserId),
        ),
      );

    return credentials as CredentialRecord[];
  }

  private async syncSingleCredential(cred: CredentialRecord): Promise<void> {
    if (!cred.encryptedUsername || !cred.encryptedPassword || !cred.auroraUserId) {
      throw new Error('Missing credentials or user ID');
    }

    const boardType = cred.boardType as AuroraBoardName;

    // Decrypt credentials
    let username: string;
    let password: string;
    try {
      username = decrypt(cred.encryptedUsername);
      password = decrypt(cred.encryptedPassword);
    } catch (decryptError) {
      await this.updateCredentialStatus(cred.userId, cred.boardType, 'error', `Decryption failed: ${decryptError}`);
      throw new Error(`Failed to decrypt credentials: ${decryptError}`);
    }

    // Get fresh token by logging in
    this.log(`[SyncRunner] Getting fresh token for user ${cred.userId} (${boardType})...`);
    const auroraClient = new AuroraClimbingClient({ boardName: boardType });
    let token: string;

    try {
      const loginResponse = await auroraClient.signIn(username, password);
      if (!loginResponse.token) {
        throw new Error('Login succeeded but no token returned');
      }
      token = loginResponse.token;
    } catch (loginError) {
      await this.updateCredentialStatus(cred.userId, cred.boardType, 'error', `Login failed: ${loginError}`);
      throw new Error(`Failed to login: ${loginError}`);
    }

    // Update stored token
    await this.updateStoredToken(cred.userId, cred.boardType, token);

    // Create a fresh pool for this sync operation to avoid stale connections
    const pool = createFreshPool();
    try {
      // Sync user data - pass NextAuth userId directly since we have it
      this.log(`[SyncRunner] Syncing user ${cred.userId} for ${boardType}...`);
      await syncUserData(pool, boardType, token, cred.auroraUserId, cred.userId, undefined, this.log.bind(this));

      // Update last sync time on success
      await this.updateCredentialStatus(cred.userId, cred.boardType, 'active', null, new Date());
    } finally {
      // Always close the pool when done
      await pool.end();
    }
  }

  private async updateCredentialStatus(
    userId: string,
    boardType: string,
    status: string,
    error: string | null,
    lastSyncAt?: Date,
  ): Promise<void> {
    // Use HTTP for simple update (no transaction needed)
    const db = createHttpDb();
    const updateData: Record<string, unknown> = {
      syncStatus: status,
      syncError: error,
      updatedAt: new Date(),
    };

    if (lastSyncAt) {
      updateData.lastSyncAt = lastSyncAt;
    }

    await db
      .update(auroraCredentials)
      .set(updateData)
      .where(and(eq(auroraCredentials.userId, userId), eq(auroraCredentials.boardType, boardType)));
  }

  private async updateStoredToken(userId: string, boardType: string, token: string): Promise<void> {
    const encryptedToken = encrypt(token);
    // Use HTTP for simple update (no transaction needed)
    const db = createHttpDb();
    await db
      .update(auroraCredentials)
      .set({
        auroraToken: encryptedToken,
        updatedAt: new Date(),
      })
      .where(and(eq(auroraCredentials.userId, userId), eq(auroraCredentials.boardType, boardType)));
  }

  /**
   * Close is now a no-op since we create fresh pools per operation
   */
  async close(): Promise<void> {
    // No-op - pools are created and closed per operation now
  }
}

export default SyncRunner;
