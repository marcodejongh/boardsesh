import { eq, and } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import {
  SaveHoldClassificationInputSchema,
  SaveUserBoardMappingInputSchema,
} from '../../../validation/schemas';

export const dataQueryMutations = {
  /**
   * Save or update a hold classification.
   * Requires authentication.
   */
  saveHoldClassification: async (
    _: unknown,
    { input }: { input: {
      boardType: string;
      layoutId: number;
      sizeId: number;
      holdId: number;
      holdType?: string | null;
      handRating?: number | null;
      footRating?: number | null;
      pullDirection?: number | null;
    }},
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const validatedInput = validateInput(SaveHoldClassificationInputSchema, input, 'input');
    const userId = ctx.userId!;

    // Check if a classification already exists
    const existing = await db
      .select()
      .from(dbSchema.userHoldClassifications)
      .where(
        and(
          eq(dbSchema.userHoldClassifications.userId, userId),
          eq(dbSchema.userHoldClassifications.boardType, validatedInput.boardType),
          eq(dbSchema.userHoldClassifications.layoutId, validatedInput.layoutId),
          eq(dbSchema.userHoldClassifications.sizeId, validatedInput.sizeId),
          eq(dbSchema.userHoldClassifications.holdId, validatedInput.holdId),
        ),
      )
      .limit(1);

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing classification
      await db
        .update(dbSchema.userHoldClassifications)
        .set({
          holdType: validatedInput.holdType ?? null,
          handRating: validatedInput.handRating ?? null,
          footRating: validatedInput.footRating ?? null,
          pullDirection: validatedInput.pullDirection ?? null,
          updatedAt: now,
        })
        .where(eq(dbSchema.userHoldClassifications.id, existing[0].id));

      return {
        id: existing[0].id.toString(),
        userId,
        boardType: validatedInput.boardType,
        layoutId: validatedInput.layoutId,
        sizeId: validatedInput.sizeId,
        holdId: validatedInput.holdId,
        holdType: validatedInput.holdType ?? null,
        handRating: validatedInput.handRating ?? null,
        footRating: validatedInput.footRating ?? null,
        pullDirection: validatedInput.pullDirection ?? null,
        createdAt: existing[0].createdAt,
        updatedAt: now,
      };
    } else {
      // Create new classification
      const [result] = await db
        .insert(dbSchema.userHoldClassifications)
        .values({
          userId,
          boardType: validatedInput.boardType,
          layoutId: validatedInput.layoutId,
          sizeId: validatedInput.sizeId,
          holdId: validatedInput.holdId,
          holdType: validatedInput.holdType ?? null,
          handRating: validatedInput.handRating ?? null,
          footRating: validatedInput.footRating ?? null,
          pullDirection: validatedInput.pullDirection ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        id: result.id.toString(),
        userId,
        boardType: validatedInput.boardType,
        layoutId: validatedInput.layoutId,
        sizeId: validatedInput.sizeId,
        holdId: validatedInput.holdId,
        holdType: validatedInput.holdType ?? null,
        handRating: validatedInput.handRating ?? null,
        footRating: validatedInput.footRating ?? null,
        pullDirection: validatedInput.pullDirection ?? null,
        createdAt: now,
        updatedAt: now,
      };
    }
  },

  /**
   * Save a user board mapping.
   * Requires authentication.
   */
  saveUserBoardMapping: async (
    _: unknown,
    { input }: { input: { boardType: string; boardUserId: number; boardUsername?: string | null } },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const validatedInput = validateInput(SaveUserBoardMappingInputSchema, input, 'input');
    const userId = ctx.userId!;

    // Upsert: check if mapping already exists
    const existing = await db
      .select()
      .from(dbSchema.userBoardMappings)
      .where(
        and(
          eq(dbSchema.userBoardMappings.userId, userId),
          eq(dbSchema.userBoardMappings.boardType, validatedInput.boardType),
          eq(dbSchema.userBoardMappings.boardUserId, validatedInput.boardUserId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing mapping
      await db
        .update(dbSchema.userBoardMappings)
        .set({
          boardUsername: validatedInput.boardUsername ?? null,
        })
        .where(eq(dbSchema.userBoardMappings.id, existing[0].id));
    } else {
      // Create new mapping
      await db
        .insert(dbSchema.userBoardMappings)
        .values({
          userId,
          boardType: validatedInput.boardType,
          boardUserId: validatedInput.boardUserId,
          boardUsername: validatedInput.boardUsername ?? null,
        });
    }

    return true;
  },
};
