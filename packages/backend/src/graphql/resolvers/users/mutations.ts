import { eq, and } from 'drizzle-orm';
import type { ConnectionContext, UserProfile, AuroraCredentialStatus } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { UpdateProfileInputSchema, SaveAuroraCredentialInputSchema, BoardNameSchema } from '../../../validation/schemas';
import { encrypt } from '@boardsesh/crypto';

export const userMutations = {
  /**
   * Update the authenticated user's profile
   */
  updateProfile: async (
    _: unknown,
    { input }: { input: { displayName?: string; avatarUrl?: string; instagramUrl?: string } },
    ctx: ConnectionContext
  ): Promise<UserProfile> => {
    requireAuthenticated(ctx);
    validateInput(UpdateProfileInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Check if profile exists
    const existingProfile = await db
      .select()
      .from(dbSchema.userProfiles)
      .where(eq(dbSchema.userProfiles.userId, userId))
      .limit(1);

    if (existingProfile.length === 0) {
      // Create new profile
      await db.insert(dbSchema.userProfiles).values({
        userId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        instagramUrl: input.instagramUrl,
      });
    } else {
      // Update existing profile
      await db
        .update(dbSchema.userProfiles)
        .set({
          displayName: input.displayName ?? existingProfile[0].displayName,
          avatarUrl: input.avatarUrl ?? existingProfile[0].avatarUrl,
          instagramUrl: input.instagramUrl ?? existingProfile[0].instagramUrl,
        })
        .where(eq(dbSchema.userProfiles.userId, userId));
    }

    // Also update the user's name if displayName is provided
    if (input.displayName !== undefined) {
      await db
        .update(dbSchema.users)
        .set({
          name: input.displayName || null,
          updatedAt: new Date(),
        })
        .where(eq(dbSchema.users.id, userId));
    }

    // Fetch and return updated profile
    const users = await db
      .select()
      .from(dbSchema.users)
      .where(eq(dbSchema.users.id, userId))
      .limit(1);

    const profiles = await db
      .select()
      .from(dbSchema.userProfiles)
      .where(eq(dbSchema.userProfiles.userId, userId))
      .limit(1);

    const user = users[0];
    const profile = profiles[0];

    return {
      id: user.id,
      email: user.email,
      displayName: profile?.displayName || user.name || undefined,
      avatarUrl: profile?.avatarUrl || user.image || undefined,
      instagramUrl: profile?.instagramUrl || undefined,
    };
  },

  /**
   * Save Aurora credentials for a board type
   */
  saveAuroraCredential: async (
    _: unknown,
    { input }: { input: { boardType: string; username: string; password: string } },
    ctx: ConnectionContext
  ): Promise<AuroraCredentialStatus> => {
    requireAuthenticated(ctx);

    // Validate input
    validateInput(SaveAuroraCredentialInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Only encrypt the password - username is not sensitive
    const encryptedPassword = encrypt(input.password);

    // Check if credential exists
    const existing = await db
      .select()
      .from(dbSchema.auroraCredentials)
      .where(
        and(
          eq(dbSchema.auroraCredentials.userId, userId),
          eq(dbSchema.auroraCredentials.boardType, input.boardType)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(dbSchema.auroraCredentials).values({
        userId,
        boardType: input.boardType,
        encryptedUsername: input.username, // Username stored as-is (not sensitive)
        encryptedPassword,
      });
    } else {
      await db
        .update(dbSchema.auroraCredentials)
        .set({
          encryptedUsername: input.username, // Username stored as-is (not sensitive)
          encryptedPassword,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dbSchema.auroraCredentials.userId, userId),
            eq(dbSchema.auroraCredentials.boardType, input.boardType)
          )
        );
    }

    return {
      boardType: input.boardType,
      username: input.username,
      hasToken: false, // Not validated yet
    };
  },

  /**
   * Delete Aurora credentials for a board type
   */
  deleteAuroraCredential: async (
    _: unknown,
    { boardType }: { boardType: string },
    ctx: ConnectionContext
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    validateInput(BoardNameSchema, boardType, 'boardType');

    await db
      .delete(dbSchema.auroraCredentials)
      .where(
        and(
          eq(dbSchema.auroraCredentials.userId, ctx.userId!),
          eq(dbSchema.auroraCredentials.boardType, boardType)
        )
      );

    return true;
  },
};
