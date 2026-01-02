import { relations } from 'drizzle-orm/relations';
import {
  kilterClimbs,
  kilterProducts,
  kilterLayouts,
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
  kilterAttempts,
  kilterAscents,
  kilterDifficultyGrades,
  kilterUserSyncs,
  kilterBetaLinks,
  kilterClimbStats,
} from '../schema/boards/kilter';

export const kilterClimbStatsRelations = relations(kilterClimbStats, ({ one }) => ({
  climb: one(kilterClimbs, {
    fields: [kilterClimbStats.climbUuid],
    references: [kilterClimbs.uuid],
    relationName: 'climb_stats_climb_uuid_fkey',
  }),
}));

export const kilterClimbsRelations = relations(kilterClimbs, ({ one, many }) => ({
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

export const kilterWallsRelations = relations(kilterWalls, ({ one }) => ({
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

export const kilterUserSyncsRelations = relations(kilterUserSyncs, ({ one }) => ({
  kilterUser: one(kilterUsers, {
    fields: [kilterUserSyncs.userId],
    references: [kilterUsers.id],
  }),
}));

export const kilterBetaLinksRelations = relations(kilterBetaLinks, ({ one }) => ({
  kilterClimb: one(kilterClimbs, {
    fields: [kilterBetaLinks.climbUuid],
    references: [kilterClimbs.uuid],
  }),
}));
