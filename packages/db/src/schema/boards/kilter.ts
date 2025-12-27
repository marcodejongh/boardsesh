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

export const kilterAttempts = pgTable('kilter_attempts', {
  id: integer().primaryKey().notNull(),
  position: integer(),
  name: text(),
});

export const kilterProducts = pgTable('kilter_products', {
  id: integer().primaryKey().notNull(),
  name: text(),
  isListed: boolean('is_listed'),
  password: text(),
  minCountInFrame: integer('min_count_in_frame'),
  maxCountInFrame: integer('max_count_in_frame'),
});

export const kilterLayouts = pgTable(
  'kilter_layouts',
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
      foreignColumns: [kilterProducts.id],
      name: 'layouts_product_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterCircuits = pgTable('kilter_circuits', {
  uuid: text().primaryKey().notNull(),
  name: text(),
  description: text(),
  color: text(),
  userId: integer('user_id'),
  isPublic: boolean('is_public'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const kilterClimbStats = pgTable(
  'kilter_climb_stats',
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
    compositePk: primaryKey({ name: 'kilter_climb_stats_pk', columns: [table.climbUuid, table.angle] }),
  }),
);

export const kilterClimbStatsHistory = pgTable('kilter_climb_stats_history', {
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

export const kilterHoles = pgTable(
  'kilter_holes',
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
      columns: [table.productId],
      foreignColumns: [kilterProducts.id],
      name: 'holes_product_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterProductSizes = pgTable(
  'kilter_product_sizes',
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
      foreignColumns: [kilterProducts.id],
      name: 'product_sizes_product_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterLeds = pgTable(
  'kilter_leds',
  {
    id: integer().primaryKey().notNull(),
    productSizeId: integer('product_size_id'),
    holeId: integer('hole_id'),
    position: integer(),
  },
  (table) => [
    foreignKey({
      columns: [table.holeId],
      foreignColumns: [kilterHoles.id],
      name: 'leds_hole_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [kilterProductSizes.id],
      name: 'leds_product_size_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterUsers = pgTable('kilter_users', {
  id: integer().primaryKey().notNull(),
  username: text(),
  createdAt: text('created_at'),
});

export const kilterClimbs = pgTable(
  'kilter_climbs',
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
    layoutFilterIdx: index('kilter_climbs_layout_filter_idx').on(
      table.layoutId,
      table.isListed,
      table.isDraft,
      table.framesCount,
    ),
    edgesIdx: index('kilter_climbs_edges_idx').on(table.edgeLeft, table.edgeRight, table.edgeBottom, table.edgeTop),
    layoutIdFkey: foreignKey({
      columns: [table.layoutId],
      foreignColumns: [kilterLayouts.id],
      name: 'climbs_layout_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  }),
);

export const kilterBids = pgTable(
  'kilter_bids',
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
      foreignColumns: [kilterClimbs.uuid],
      name: 'bids_climb_uuid_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [kilterUsers.id],
      name: 'bids_user_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterDifficultyGrades = pgTable('kilter_difficulty_grades', {
  difficulty: integer().primaryKey().notNull(),
  boulderName: text('boulder_name'),
  routeName: text('route_name'),
  isListed: boolean('is_listed'),
});

export const kilterSets = pgTable('kilter_sets', {
  id: integer().primaryKey().notNull(),
  name: text(),
  hsm: integer(),
});

export const kilterPlacementRoles = pgTable(
  'kilter_placement_roles',
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
      foreignColumns: [kilterProducts.id],
      name: 'placement_roles_product_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterPlacements = pgTable(
  'kilter_placements',
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
      foreignColumns: [kilterPlacementRoles.id],
      name: 'placements_default_placement_role_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.holeId],
      foreignColumns: [kilterHoles.id],
      name: 'placements_hole_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.layoutId],
      foreignColumns: [kilterLayouts.id],
      name: 'placements_layout_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.setId],
      foreignColumns: [kilterSets.id],
      name: 'placements_set_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterProductSizesLayoutsSets = pgTable(
  'kilter_product_sizes_layouts_sets',
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
      foreignColumns: [kilterLayouts.id],
      name: 'product_sizes_layouts_sets_layout_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [kilterProductSizes.id],
      name: 'product_sizes_layouts_sets_product_size_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.setId],
      foreignColumns: [kilterSets.id],
      name: 'product_sizes_layouts_sets_set_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterSharedSyncs = pgTable('kilter_shared_syncs', {
  tableName: text('table_name').primaryKey().notNull(),
  lastSynchronizedAt: text('last_synchronized_at'),
});

export const kilterWalls = pgTable(
  'kilter_walls',
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
      foreignColumns: [kilterLayouts.id],
      name: 'walls_layout_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [kilterProducts.id],
      name: 'walls_product_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.productSizeId],
      foreignColumns: [kilterProductSizes.id],
      name: 'walls_product_size_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [kilterUsers.id],
      name: 'walls_user_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterClimbHolds = pgTable(
  'kilter_climb_holds',
  {
    climbUuid: text('climb_uuid').notNull(),
    holdId: integer('hold_id').notNull(),
    frameNumber: integer('frame_number').notNull(),
    holdState: text('hold_state').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.climbUuid, table.holdId] }),
    holdSearchIdx: index('kilter_climb_holds_search_idx').on(table.holdId, table.holdState),
  }),
);

export const kilterAscents = pgTable(
  'kilter_ascents',
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
      foreignColumns: [kilterAttempts.id],
      name: 'ascents_attempt_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.climbUuid],
      foreignColumns: [kilterClimbs.uuid],
      name: 'ascents_climb_uuid_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.difficulty],
      foreignColumns: [kilterDifficultyGrades.difficulty],
      name: 'ascents_difficulty_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [kilterUsers.id],
      name: 'ascents_user_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterCircuitsClimbs = pgTable(
  'kilter_circuits_climbs',
  {
    circuitUuid: text('circuit_uuid').notNull(),
    climbUuid: text('climb_uuid').notNull(),
    position: integer(),
  },
  () => [],
);

export const kilterUserSyncs = pgTable(
  'kilter_user_syncs',
  {
    userId: integer('user_id').notNull(),
    tableName: text('table_name').notNull(),
    lastSynchronizedAt: text('last_synchronized_at'),
  },
  (table) => [
    primaryKey({ name: 'kilter_user_sync_pk', columns: [table.userId, table.tableName] }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [kilterUsers.id],
      name: 'user_syncs_user_id_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const kilterTags = pgTable(
  'kilter_tags',
  {
    entityUuid: text('entity_uuid').notNull(),
    userId: integer('user_id').notNull(),
    name: text().notNull(),
    isListed: boolean('is_listed'),
  },
  () => [],
);

export const kilterBetaLinks = pgTable(
  'kilter_beta_links',
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
      foreignColumns: [kilterClimbs.uuid],
      name: 'beta_links_climb_uuid_fkey1',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);
