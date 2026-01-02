import { relations } from 'drizzle-orm/relations';
import {
  tensionClimbs,
  tensionProducts,
  tensionLayouts,
  tensionHoles,
  tensionLeds,
  tensionProductSizes,
  tensionBids,
  tensionUsers,
  tensionPlacementRoles,
  tensionPlacements,
  tensionSets,
  tensionProductSizesLayoutsSets,
  tensionWalls,
  tensionAttempts,
  tensionAscents,
  tensionDifficultyGrades,
  tensionUserSyncs,
  tensionBetaLinks,
  tensionClimbStats,
} from '../schema/boards/tension';

export const tensionClimbStatsRelations = relations(tensionClimbStats, ({ one }) => ({
  climb: one(tensionClimbs, {
    fields: [tensionClimbStats.climbUuid],
    references: [tensionClimbs.uuid],
    relationName: 'climb_stats_climb_uuid_fkey',
  }),
}));

export const tensionClimbsRelations = relations(tensionClimbs, ({ one, many }) => ({
  tensionBids: many(tensionBids),
  tensionLayout: one(tensionLayouts, {
    fields: [tensionClimbs.layoutId],
    references: [tensionLayouts.id],
  }),
  tensionAscents: many(tensionAscents),
  tensionBetaLinks: many(tensionBetaLinks),
}));

export const tensionLayoutsRelations = relations(tensionLayouts, ({ one, many }) => ({
  tensionClimbs: many(tensionClimbs),
  tensionPlacements: many(tensionPlacements),
  tensionProduct: one(tensionProducts, {
    fields: [tensionLayouts.productId],
    references: [tensionProducts.id],
  }),
  tensionProductSizesLayoutsSets: many(tensionProductSizesLayoutsSets),
  tensionWalls: many(tensionWalls),
}));

export const tensionProductsRelations = relations(tensionProducts, ({ many }) => ({
  tensionHoles: many(tensionHoles),
  tensionPlacementRoles: many(tensionPlacementRoles),
  tensionLayouts: many(tensionLayouts),
  tensionProductSizes: many(tensionProductSizes),
  tensionWalls: many(tensionWalls),
}));

export const tensionBidsRelations = relations(tensionBids, ({ one }) => ({
  tensionClimb: one(tensionClimbs, {
    fields: [tensionBids.climbUuid],
    references: [tensionClimbs.uuid],
  }),
  tensionUser: one(tensionUsers, {
    fields: [tensionBids.userId],
    references: [tensionUsers.id],
  }),
}));

export const tensionUsersRelations = relations(tensionUsers, ({ many }) => ({
  tensionBids: many(tensionBids),
  tensionWalls: many(tensionWalls),
  tensionAscents: many(tensionAscents),
  tensionUserSyncs: many(tensionUserSyncs),
}));

export const tensionHolesRelations = relations(tensionHoles, ({ one, many }) => ({
  tensionHole: one(tensionHoles, {
    fields: [tensionHoles.mirroredHoleId],
    references: [tensionHoles.id],
    relationName: 'tensionHoles_mirroredHoleId_tensionHoles_id',
  }),
  tensionHoles: many(tensionHoles, {
    relationName: 'tensionHoles_mirroredHoleId_tensionHoles_id',
  }),
  tensionProduct: one(tensionProducts, {
    fields: [tensionHoles.productId],
    references: [tensionProducts.id],
  }),
  tensionPlacements: many(tensionPlacements),
  tensionLeds: many(tensionLeds),
}));

export const tensionPlacementsRelations = relations(tensionPlacements, ({ one }) => ({
  tensionPlacementRole: one(tensionPlacementRoles, {
    fields: [tensionPlacements.defaultPlacementRoleId],
    references: [tensionPlacementRoles.id],
  }),
  tensionHole: one(tensionHoles, {
    fields: [tensionPlacements.holeId],
    references: [tensionHoles.id],
  }),
  tensionLayout: one(tensionLayouts, {
    fields: [tensionPlacements.layoutId],
    references: [tensionLayouts.id],
  }),
  tensionSet: one(tensionSets, {
    fields: [tensionPlacements.setId],
    references: [tensionSets.id],
  }),
}));

export const tensionPlacementRolesRelations = relations(tensionPlacementRoles, ({ one, many }) => ({
  tensionPlacements: many(tensionPlacements),
  tensionProduct: one(tensionProducts, {
    fields: [tensionPlacementRoles.productId],
    references: [tensionProducts.id],
  }),
}));

export const tensionSetsRelations = relations(tensionSets, ({ many }) => ({
  tensionPlacements: many(tensionPlacements),
  tensionProductSizesLayoutsSets: many(tensionProductSizesLayoutsSets),
}));

export const tensionLedsRelations = relations(tensionLeds, ({ one }) => ({
  tensionHole: one(tensionHoles, {
    fields: [tensionLeds.holeId],
    references: [tensionHoles.id],
  }),
  tensionProductSize: one(tensionProductSizes, {
    fields: [tensionLeds.productSizeId],
    references: [tensionProductSizes.id],
  }),
}));

export const tensionProductSizesRelations = relations(tensionProductSizes, ({ one, many }) => ({
  tensionLeds: many(tensionLeds),
  tensionProductSizesLayoutsSets: many(tensionProductSizesLayoutsSets),
  tensionProduct: one(tensionProducts, {
    fields: [tensionProductSizes.productId],
    references: [tensionProducts.id],
  }),
  tensionWalls: many(tensionWalls),
}));

export const tensionProductSizesLayoutsSetsRelations = relations(tensionProductSizesLayoutsSets, ({ one }) => ({
  tensionLayout: one(tensionLayouts, {
    fields: [tensionProductSizesLayoutsSets.layoutId],
    references: [tensionLayouts.id],
  }),
  tensionProductSize: one(tensionProductSizes, {
    fields: [tensionProductSizesLayoutsSets.productSizeId],
    references: [tensionProductSizes.id],
  }),
  tensionSet: one(tensionSets, {
    fields: [tensionProductSizesLayoutsSets.setId],
    references: [tensionSets.id],
  }),
}));

export const tensionWallsRelations = relations(tensionWalls, ({ one }) => ({
  tensionLayout: one(tensionLayouts, {
    fields: [tensionWalls.layoutId],
    references: [tensionLayouts.id],
  }),
  tensionProduct: one(tensionProducts, {
    fields: [tensionWalls.productId],
    references: [tensionProducts.id],
  }),
  tensionProductSize: one(tensionProductSizes, {
    fields: [tensionWalls.productSizeId],
    references: [tensionProductSizes.id],
  }),
  tensionUser: one(tensionUsers, {
    fields: [tensionWalls.userId],
    references: [tensionUsers.id],
  }),
}));

export const tensionAscentsRelations = relations(tensionAscents, ({ one }) => ({
  tensionAttempt: one(tensionAttempts, {
    fields: [tensionAscents.attemptId],
    references: [tensionAttempts.id],
  }),
  tensionClimb: one(tensionClimbs, {
    fields: [tensionAscents.climbUuid],
    references: [tensionClimbs.uuid],
  }),
  tensionDifficultyGrade: one(tensionDifficultyGrades, {
    fields: [tensionAscents.difficulty],
    references: [tensionDifficultyGrades.difficulty],
  }),
  tensionUser: one(tensionUsers, {
    fields: [tensionAscents.userId],
    references: [tensionUsers.id],
  }),
}));

export const tensionAttemptsRelations = relations(tensionAttempts, ({ many }) => ({
  tensionAscents: many(tensionAscents),
}));

export const tensionDifficultyGradesRelations = relations(tensionDifficultyGrades, ({ many }) => ({
  tensionAscents: many(tensionAscents),
}));

export const tensionUserSyncsRelations = relations(tensionUserSyncs, ({ one }) => ({
  tensionUser: one(tensionUsers, {
    fields: [tensionUserSyncs.userId],
    references: [tensionUsers.id],
  }),
}));

export const tensionBetaLinksRelations = relations(tensionBetaLinks, ({ one }) => ({
  tensionClimb: one(tensionClimbs, {
    fields: [tensionBetaLinks.climbUuid],
    references: [tensionClimbs.uuid],
  }),
}));
