import {
  pgTable,
  foreignKey,
  bigserial,
  text,
  integer,
  doublePrecision,
  boolean,
  bigint,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const tensionAttempts = pgTable('tension_attempts', {
  id: integer().primaryKey().notNull(),
  position: integer(),
  name: text(),
});

export const tensionProducts = pgTable('tension_products', {
  id: integer().primaryKey().notNull(),
  name: text(),
  isListed: boolean('is_listed'),
  password: text(),
  minCountInFrame: integer('min_count_in_frame'),
  maxCountInFrame: integer('max_count_in_frame'),
});

export const tensionLayouts = pgTable(
  'tension_layouts',
  {
    id: integer().primaryKey().notNull(),
    productId: integer('product_id'),
    name: text(),
    instagramCaption: text('instagram_caption'),
    isMirrored: boolean('is_mirrored'),
    isListed: boolean('is_listed'),
    password: text(),
    createdAt: text('created_at'),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [tensionProducts.id],
      name: 'layouts_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionCircuits = pgTable('tension_circuits', {
  uuid: text().primaryKey().notNull(),
  name: text(),
  description: text(),
  color: text(),
  userId: integer('user_id'),
  isPublic: boolean('is_public'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const tensionClimbStats = pgTable(
  'tension_climb_stats',
  {
    climbUuid: text('climb_uuid').notNull(),
    angle: integer('angle').notNull(),
    displayDifficulty: doublePrecision('display_difficulty'),
    benchmarkDifficulty: doublePrecision('benchmark_difficulty'),
    ascensionistCount: bigint('ascensionist_count', { mode: 'number' }),
    difficultyAverage: doublePrecision('difficulty_average'),
    qualityAverage: doublePrecision('quality_average'),
    faUsername: text('fa_username'),
    faAt: timestamp('fa_at', { mode: 'string' }),
  },
  (table) => ({
    compositePk: primaryKey({ name: 'tension_climb_stats_pk', columns: [table.climbUuid, table.angle] }),
  }),
);

export const tensionClimbStatsHistory = pgTable('tension_climb_stats_history', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  climbUuid: text('climb_uuid').notNull(),
  angle: integer('angle').notNull(),
  displayDifficulty: doublePrecision('display_difficulty'),
  benchmarkDifficulty: doublePrecision('benchmark_difficulty'),
  ascensionistCount: bigint('ascensionist_count', { mode: 'number' }),
  difficultyAverage: doublePrecision('difficulty_average'),
  qualityAverage: doublePrecision('quality_average'),
  faUsername: text('fa_username'),
  faAt: timestamp('fa_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const tensionHoles = pgTable(
  'tension_holes',
  {
    id: integer().primaryKey().notNull(),
    productId: integer('product_id'),
    name: text(),
    x: integer(),
    y: integer(),
    mirroredHoleId: integer('mirrored_hole_id'),
    mirrorGroup: integer('mirror_group').default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.mirroredHoleId],
      foreignColumns: [table.id],
      name: 'holes_mirrored_hole_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [tensionProducts.id],
      name: 'holes_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionProductSizes = pgTable(
  'tension_product_sizes',
  {
    id: integer().primaryKey().notNull(),
    productId: integer('product_id'),
    edgeLeft: integer('edge_left'),
    edgeRight: integer('edge_right'),
    edgeBottom: integer('edge_bottom'),
    edgeTop: integer('edge_top'),
    name: text(),
    description: text(),
    imageFilename: text('image_filename'),
    position: integer(),
    isListed: boolean('is_listed'),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [tensionProducts.id],
      name: 'product_sizes_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionLeds = pgTable(
  'tension_leds',
  {
    id: integer().primaryKey().notNull(),
    productSizeId: integer('product_size_id'),
    holeId: integer('hole_id'),
    position: integer(),
  },
  (table) => [
    foreignKey({
      columns: [table.holeId],
      foreignColumns: [tensionHoles.id],
      name: 'leds_hole_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [tensionProductSizes.id],
      name: 'leds_product_size_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionUsers = pgTable('tension_users', {
  id: integer().primaryKey().notNull(),
  username: text(),
  createdAt: text('created_at'),
});

export const tensionClimbs = pgTable(
  'tension_climbs',
  {
    uuid: text().primaryKey().notNull(),
    layoutId: integer('layout_id'),
    setterId: integer('setter_id'),
    setterUsername: text('setter_username'),
    name: text(),
    description: text().default(''),
    hsm: integer(),
    edgeLeft: integer('edge_left'),
    edgeRight: integer('edge_right'),
    edgeBottom: integer('edge_bottom'),
    edgeTop: integer('edge_top'),
    angle: integer(),
    framesCount: integer('frames_count').default(1),
    framesPace: integer('frames_pace').default(0),
    frames: text(),
    isDraft: boolean('is_draft').default(false),
    isListed: boolean('is_listed'),
    createdAt: text('created_at'),
    synced: boolean('synced').default(true).notNull(),
    syncError: text('sync_error'),
  },
  (table) => ({
    layoutFilterIdx: index('tension_climbs_layout_filter_idx').on(
      table.layoutId,
      table.isListed,
      table.isDraft,
      table.framesCount,
    ),
    edgesIdx: index('tension_climbs_edges_idx').on(table.edgeLeft, table.edgeRight, table.edgeBottom, table.edgeTop),
    layoutIdFkey: foreignKey({
      columns: [table.layoutId],
      foreignColumns: [tensionLayouts.id],
      name: 'climbs_layout_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  }),
);

export const tensionBids = pgTable(
  'tension_bids',
  {
    uuid: text().primaryKey().notNull(),
    userId: integer('user_id'),
    climbUuid: text('climb_uuid'),
    angle: integer(),
    isMirror: boolean('is_mirror'),
    bidCount: integer('bid_count').default(1),
    comment: text().default(''),
    climbedAt: text('climbed_at'),
    createdAt: text('created_at'),
    synced: boolean('synced').default(true).notNull(),
    syncError: text('sync_error'),
  },
  (table) => [
    foreignKey({
      columns: [table.climbUuid],
      foreignColumns: [tensionClimbs.uuid],
      name: 'bids_climb_uuid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tensionUsers.id],
      name: 'bids_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionDifficultyGrades = pgTable('tension_difficulty_grades', {
  difficulty: integer().primaryKey().notNull(),
  boulderName: text('boulder_name'),
  routeName: text('route_name'),
  isListed: boolean('is_listed'),
});

export const tensionSets = pgTable('tension_sets', {
  id: integer().primaryKey().notNull(),
  name: text(),
  hsm: integer(),
});

export const tensionPlacementRoles = pgTable(
  'tension_placement_roles',
  {
    id: integer().primaryKey().notNull(),
    productId: integer('product_id'),
    position: integer(),
    name: text(),
    fullName: text('full_name'),
    ledColor: text('led_color'),
    screenColor: text('screen_color'),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [tensionProducts.id],
      name: 'placement_roles_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionPlacements = pgTable(
  'tension_placements',
  {
    id: integer().primaryKey().notNull(),
    layoutId: integer('layout_id'),
    holeId: integer('hole_id'),
    setId: integer('set_id'),
    defaultPlacementRoleId: integer('default_placement_role_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.defaultPlacementRoleId],
      foreignColumns: [tensionPlacementRoles.id],
      name: 'placements_default_placement_role_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.holeId],
      foreignColumns: [tensionHoles.id],
      name: 'placements_hole_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.layoutId],
      foreignColumns: [tensionLayouts.id],
      name: 'placements_layout_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.setId],
      foreignColumns: [tensionSets.id],
      name: 'placements_set_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionProductSizesLayoutsSets = pgTable(
  'tension_product_sizes_layouts_sets',
  {
    id: integer().primaryKey().notNull(),
    productSizeId: integer('product_size_id'),
    layoutId: integer('layout_id'),
    setId: integer('set_id'),
    imageFilename: text('image_filename'),
    isListed: boolean('is_listed'),
  },
  (table) => [
    foreignKey({
      columns: [table.layoutId],
      foreignColumns: [tensionLayouts.id],
      name: 'product_sizes_layouts_sets_layout_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [tensionProductSizes.id],
      name: 'product_sizes_layouts_sets_product_size_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.setId],
      foreignColumns: [tensionSets.id],
      name: 'product_sizes_layouts_sets_set_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionSharedSyncs = pgTable('tension_shared_syncs', {
  tableName: text('table_name').primaryKey().notNull(),
  lastSynchronizedAt: text('last_synchronized_at'),
});

export const tensionWalls = pgTable(
  'tension_walls',
  {
    uuid: text().primaryKey().notNull(),
    userId: integer('user_id'),
    name: text(),
    productId: integer('product_id'),
    isAdjustable: boolean('is_adjustable'),
    angle: integer(),
    layoutId: integer('layout_id'),
    productSizeId: integer('product_size_id'),
    hsm: integer(),
    serialNumber: text('serial_number'),
    createdAt: text('created_at'),
  },
  (table) => [
    foreignKey({
      columns: [table.layoutId],
      foreignColumns: [tensionLayouts.id],
      name: 'walls_layout_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [tensionProducts.id],
      name: 'walls_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [tensionProductSizes.id],
      name: 'walls_product_size_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tensionUsers.id],
      name: 'walls_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionClimbHolds = pgTable(
  'tension_climb_holds',
  {
    climbUuid: text('climb_uuid').notNull(),
    holdId: integer('hold_id').notNull(),
    frameNumber: integer('frame_number').notNull(),
    holdState: text('hold_state').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.climbUuid, table.holdId] }),
    holdSearchIdx: index('tension_climb_holds_search_idx').on(table.holdId, table.holdState),
  }),
);

export const tensionAscents = pgTable(
  'tension_ascents',
  {
    uuid: text().primaryKey().notNull(),
    climbUuid: text('climb_uuid'),
    angle: integer(),
    isMirror: boolean('is_mirror'),
    userId: integer('user_id'),
    attemptId: integer('attempt_id'),
    bidCount: integer('bid_count').default(1),
    quality: integer(),
    difficulty: integer(),
    isBenchmark: integer('is_benchmark').default(0),
    comment: text().default(''),
    climbedAt: text('climbed_at'),
    createdAt: text('created_at'),
    synced: boolean('synced').default(true).notNull(),
    syncError: text('sync_error'),
  },
  (table) => [
    foreignKey({
      columns: [table.attemptId],
      foreignColumns: [tensionAttempts.id],
      name: 'ascents_attempt_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.climbUuid],
      foreignColumns: [tensionClimbs.uuid],
      name: 'ascents_climb_uuid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.difficulty],
      foreignColumns: [tensionDifficultyGrades.difficulty],
      name: 'ascents_difficulty_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tensionUsers.id],
      name: 'ascents_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionCircuitsClimbs = pgTable(
  'tension_circuits_climbs',
  {
    circuitUuid: text('circuit_uuid').notNull(),
    climbUuid: text('climb_uuid').notNull(),
    position: integer(),
  },
  () => [],
);

export const tensionUserSyncs = pgTable(
  'tension_user_syncs',
  {
    userId: integer('user_id').notNull(),
    tableName: text('table_name').notNull(),
    lastSynchronizedAt: text('last_synchronized_at'),
  },
  (table) => [
    primaryKey({ name: 'tension_user_sync_pk', columns: [table.userId, table.tableName] }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [tensionUsers.id],
      name: 'user_syncs_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const tensionTags = pgTable(
  'tension_tags',
  {
    entityUuid: text('entity_uuid').notNull(),
    userId: integer('user_id').notNull(),
    name: text().notNull(),
    isListed: boolean('is_listed'),
  },
  () => [],
);

export const tensionBetaLinks = pgTable(
  'tension_beta_links',
  {
    climbUuid: text('climb_uuid').notNull(),
    link: text().notNull(),
    foreignUsername: text('foreign_username'),
    angle: integer(),
    thumbnail: text(),
    isListed: boolean('is_listed'),
    createdAt: text('created_at'),
  },
  (table) => [
    foreignKey({
      columns: [table.climbUuid],
      foreignColumns: [tensionClimbs.uuid],
      name: 'beta_links_climb_uuid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);
