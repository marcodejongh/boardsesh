import { relations } from 'drizzle-orm/relations';
import {
  kilterClimbs,
  kilterClimbCacheFields,
  kilterProducts,
  kilterLayouts,
  tensionClimbs,
  tensionClimbCacheFields,
  kilterHoles,
  kilterLeds,
  kilterProductSizes,
  kilterBids,
  kilterUsers,
  kilterPlacementRoles,
  kilterPlacements,
  kilterSets,
  kilterProductSizesLayoutsSets,
  kilterWalls,
  tensionBids,
  tensionUsers,
  tensionHoles,
  tensionProducts,
  tensionLayouts,
  tensionPlacementRoles,
  tensionPlacements,
  tensionSets,
  tensionLeds,
  tensionProductSizes,
  tensionProductSizesLayoutsSets,
  kilterAttempts,
  kilterAscents,
  kilterDifficultyGrades,
  tensionWalls,
  tensionAttempts,
  tensionAscents,
  tensionDifficultyGrades,
  kilterProductsAngles,
  kilterWallsSets,
  tensionWallsSets,
  tensionProductsAngles,
  kilterUserSyncs,
  tensionUserSyncs,
  kilterBetaLinks,
  tensionBetaLinks,
  tensionClimbStats,
  kilterClimbStats,
} from './schema';

export const tensionClimbStatsRelations = relations(tensionClimbStats, ({ one }) => ({
  climb: one(tensionClimbs, {
    fields: [tensionClimbStats.climbUuid],
    references: [tensionClimbs.uuid],
    relationName: 'climb_stats_climb_uuid_fkey',
  }),
}));

export const kilterClimbStatsRelations = relations(kilterClimbStats, ({ one }) => ({
  climb: one(kilterClimbs, {
    fields: [kilterClimbStats.climbUuid],
    references: [kilterClimbs.uuid],
    relationName: 'climb_stats_climb_uuid_fkey',
  }),
}));

export const kilterClimbCacheFieldsRelations = relations(kilterClimbCacheFields, ({ one }) => ({
  kilterClimb: one(kilterClimbs, {
    fields: [kilterClimbCacheFields.climbUuid],
    references: [kilterClimbs.uuid],
  }),
}));

export const kilterClimbsRelations = relations(kilterClimbs, ({ one, many }) => ({
  kilterClimbCacheFields: many(kilterClimbCacheFields),
  kilterBids: many(kilterBids),
  kilterLayout: one(kilterLayouts, {
    fields: [kilterClimbs.layoutId],
    references: [kilterLayouts.id],
  }),
  kilterAscents: many(kilterAscents),
  kilterBetaLinks: many(kilterBetaLinks),
}));

export const kilterLayoutsRelations = relations(kilterLayouts, ({ one, many }) => ({
  kilterProduct: one(kilterProducts, {
    fields: [kilterLayouts.productId],
    references: [kilterProducts.id],
  }),
  kilterPlacements: many(kilterPlacements),
  kilterClimbs: many(kilterClimbs),
  kilterProductSizesLayoutsSets: many(kilterProductSizesLayoutsSets),
  kilterWalls: many(kilterWalls),
}));

export const kilterProductsRelations = relations(kilterProducts, ({ many }) => ({
  kilterLayouts: many(kilterLayouts),
  kilterProductSizes: many(kilterProductSizes),
  kilterHoles: many(kilterHoles),
  kilterPlacementRoles: many(kilterPlacementRoles),
  kilterWalls: many(kilterWalls),
  kilterProductsAngles: many(kilterProductsAngles),
}));

export const tensionClimbCacheFieldsRelations = relations(tensionClimbCacheFields, ({ one }) => ({
  tensionClimb: one(tensionClimbs, {
    fields: [tensionClimbCacheFields.climbUuid],
    references: [tensionClimbs.uuid],
  }),
}));

export const tensionClimbsRelations = relations(tensionClimbs, ({ one, many }) => ({
  tensionClimbCacheFields: many(tensionClimbCacheFields),
  tensionBids: many(tensionBids),
  tensionLayout: one(tensionLayouts, {
    fields: [tensionClimbs.layoutId],
    references: [tensionLayouts.id],
  }),
  tensionAscents: many(tensionAscents),
  tensionBetaLinks: many(tensionBetaLinks),
}));

export const kilterLedsRelations = relations(kilterLeds, ({ one }) => ({
  kilterHole: one(kilterHoles, {
    fields: [kilterLeds.holeId],
    references: [kilterHoles.id],
  }),
  kilterProductSize: one(kilterProductSizes, {
    fields: [kilterLeds.productSizeId],
    references: [kilterProductSizes.id],
  }),
}));

export const kilterHolesRelations = relations(kilterHoles, ({ one, many }) => ({
  kilterLeds: many(kilterLeds),
  kilterProduct: one(kilterProducts, {
    fields: [kilterHoles.productId],
    references: [kilterProducts.id],
  }),
  kilterPlacements: many(kilterPlacements),
}));

export const kilterProductSizesRelations = relations(kilterProductSizes, ({ one, many }) => ({
  kilterLeds: many(kilterLeds),
  kilterProduct: one(kilterProducts, {
    fields: [kilterProductSizes.productId],
    references: [kilterProducts.id],
  }),
  kilterProductSizesLayoutsSets: many(kilterProductSizesLayoutsSets),
  kilterWalls: many(kilterWalls),
}));

export const kilterBidsRelations = relations(kilterBids, ({ one }) => ({
  kilterClimb: one(kilterClimbs, {
    fields: [kilterBids.climbUuid],
    references: [kilterClimbs.uuid],
  }),
  kilterUser: one(kilterUsers, {
    fields: [kilterBids.userId],
    references: [kilterUsers.id],
  }),
}));

export const kilterUsersRelations = relations(kilterUsers, ({ many }) => ({
  kilterBids: many(kilterBids),
  kilterWalls: many(kilterWalls),
  kilterAscents: many(kilterAscents),
  kilterUserSyncs: many(kilterUserSyncs),
}));

export const kilterPlacementRolesRelations = relations(kilterPlacementRoles, ({ one, many }) => ({
  kilterProduct: one(kilterProducts, {
    fields: [kilterPlacementRoles.productId],
    references: [kilterProducts.id],
  }),
  kilterPlacements: many(kilterPlacements),
}));

export const kilterPlacementsRelations = relations(kilterPlacements, ({ one }) => ({
  kilterPlacementRole: one(kilterPlacementRoles, {
    fields: [kilterPlacements.defaultPlacementRoleId],
    references: [kilterPlacementRoles.id],
  }),
  kilterHole: one(kilterHoles, {
    fields: [kilterPlacements.holeId],
    references: [kilterHoles.id],
  }),
  kilterLayout: one(kilterLayouts, {
    fields: [kilterPlacements.layoutId],
    references: [kilterLayouts.id],
  }),
  kilterSet: one(kilterSets, {
    fields: [kilterPlacements.setId],
    references: [kilterSets.id],
  }),
}));

export const kilterSetsRelations = relations(kilterSets, ({ many }) => ({
  kilterPlacements: many(kilterPlacements),
  kilterProductSizesLayoutsSets: many(kilterProductSizesLayoutsSets),
  kilterWallsSets: many(kilterWallsSets),
}));

export const kilterProductSizesLayoutsSetsRelations = relations(kilterProductSizesLayoutsSets, ({ one }) => ({
  kilterLayout: one(kilterLayouts, {
    fields: [kilterProductSizesLayoutsSets.layoutId],
    references: [kilterLayouts.id],
  }),
  kilterProductSize: one(kilterProductSizes, {
    fields: [kilterProductSizesLayoutsSets.productSizeId],
    references: [kilterProductSizes.id],
  }),
  kilterSet: one(kilterSets, {
    fields: [kilterProductSizesLayoutsSets.setId],
    references: [kilterSets.id],
  }),
}));

export const kilterWallsRelations = relations(kilterWalls, ({ one, many }) => ({
  kilterLayout: one(kilterLayouts, {
    fields: [kilterWalls.layoutId],
    references: [kilterLayouts.id],
  }),
  kilterProduct: one(kilterProducts, {
    fields: [kilterWalls.productId],
    references: [kilterProducts.id],
  }),
  kilterProductSize: one(kilterProductSizes, {
    fields: [kilterWalls.productSizeId],
    references: [kilterProductSizes.id],
  }),
  kilterUser: one(kilterUsers, {
    fields: [kilterWalls.userId],
    references: [kilterUsers.id],
  }),
  kilterWallsSets: many(kilterWallsSets),
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

export const tensionProductsRelations = relations(tensionProducts, ({ many }) => ({
  tensionHoles: many(tensionHoles),
  tensionPlacementRoles: many(tensionPlacementRoles),
  tensionLayouts: many(tensionLayouts),
  tensionProductSizes: many(tensionProductSizes),
  tensionWalls: many(tensionWalls),
  tensionProductsAngles: many(tensionProductsAngles),
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
  tensionWallsSets: many(tensionWallsSets),
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

export const kilterAscentsRelations = relations(kilterAscents, ({ one }) => ({
  kilterAttempt: one(kilterAttempts, {
    fields: [kilterAscents.attemptId],
    references: [kilterAttempts.id],
  }),
  kilterClimb: one(kilterClimbs, {
    fields: [kilterAscents.climbUuid],
    references: [kilterClimbs.uuid],
  }),
  kilterDifficultyGrade: one(kilterDifficultyGrades, {
    fields: [kilterAscents.difficulty],
    references: [kilterDifficultyGrades.difficulty],
  }),
  kilterUser: one(kilterUsers, {
    fields: [kilterAscents.userId],
    references: [kilterUsers.id],
  }),
}));

export const kilterAttemptsRelations = relations(kilterAttempts, ({ many }) => ({
  kilterAscents: many(kilterAscents),
}));

export const kilterDifficultyGradesRelations = relations(kilterDifficultyGrades, ({ many }) => ({
  kilterAscents: many(kilterAscents),
}));

export const tensionWallsRelations = relations(tensionWalls, ({ one, many }) => ({
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
  tensionWallsSets: many(tensionWallsSets),
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

export const kilterProductsAnglesRelations = relations(kilterProductsAngles, ({ one }) => ({
  kilterProduct: one(kilterProducts, {
    fields: [kilterProductsAngles.productId],
    references: [kilterProducts.id],
  }),
}));

export const kilterWallsSetsRelations = relations(kilterWallsSets, ({ one }) => ({
  kilterSet: one(kilterSets, {
    fields: [kilterWallsSets.setId],
    references: [kilterSets.id],
  }),
  kilterWall: one(kilterWalls, {
    fields: [kilterWallsSets.wallUuid],
    references: [kilterWalls.uuid],
  }),
}));

export const tensionWallsSetsRelations = relations(tensionWallsSets, ({ one }) => ({
  tensionSet: one(tensionSets, {
    fields: [tensionWallsSets.setId],
    references: [tensionSets.id],
  }),
  tensionWall: one(tensionWalls, {
    fields: [tensionWallsSets.wallUuid],
    references: [tensionWalls.uuid],
  }),
}));

export const tensionProductsAnglesRelations = relations(tensionProductsAngles, ({ one }) => ({
  tensionProduct: one(tensionProducts, {
    fields: [tensionProductsAngles.productId],
    references: [tensionProducts.id],
  }),
}));

export const kilterUserSyncsRelations = relations(kilterUserSyncs, ({ one }) => ({
  kilterUser: one(kilterUsers, {
    fields: [kilterUserSyncs.userId],
    references: [kilterUsers.id],
  }),
}));

export const tensionUserSyncsRelations = relations(tensionUserSyncs, ({ one }) => ({
  tensionUser: one(tensionUsers, {
    fields: [tensionUserSyncs.userId],
    references: [tensionUsers.id],
  }),
}));

export const kilterBetaLinksRelations = relations(kilterBetaLinks, ({ one }) => ({
  kilterClimb: one(kilterClimbs, {
    fields: [kilterBetaLinks.climbUuid],
    references: [kilterClimbs.uuid],
  }),
}));

export const tensionBetaLinksRelations = relations(tensionBetaLinks, ({ one }) => ({
  tensionClimb: one(tensionClimbs, {
    fields: [tensionBetaLinks.climbUuid],
    references: [tensionClimbs.uuid],
  }),
}));
