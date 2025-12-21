export interface User {
  id: number;
  username: string;
  email_address: string;
  name: string | null;
  city: string | null;
  country: string | null;
  avatar_image: string | null;
  banner_image: string | null;
  height: number | null;
  wingspan: number | null;
  weight: number | null;
  instagram_username: string | null;
  is_public: boolean;
  is_listed: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

export interface Wall {
  uuid: string;
  name: string;
  user_id: number;
  product_id: number;
  is_adjustable: boolean;
  angle: number;
  layout_id: number;
  product_size_id: number;
  hsm: number;
  serial_number: string | null;
  set_ids: number[];
  is_listed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WallExpungement {
  wall_uuid: string;
  created_at: string;
  updated_at: string;
}

export interface Ascent {
  uuid: string;
  wall_uuid: string | null;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  user_id: number;
  attempt_id: number;
  bid_count: number;
  quality: number;
  difficulty: number;
  is_benchmark: boolean;
  is_listed: boolean;
  comment: string;
  climbed_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserSync {
  user_id: number;
  table_name: string;
  last_synchronized_at: string;
}

export interface Attempt {
  id: number;
  position: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  is_listed: boolean;
  password: string | null;
  min_count_in_frame: number;
  max_count_in_frame: number;
}

export interface ProductSize {
  id: number;
  product_id: number;
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  name: string;
  description: string;
  image_filename: string | null;
  position: number;
  is_listed: boolean;
}

export interface ClimbStats {
  climb_uuid: string;
  angle: number;
  display_difficulty: number;
  benchmark_difficulty: number;
  ascensionist_count: number;
  difficulty_average: number;
  quality_average: number;
  fa_username: string;
  fa_at: string;
}

export interface Hole {
  id: number;
  product_id: number;
  name: string;
  x: number;
  y: number;
  mirrored_hole_id: number | null;
  mirror_group: number;
}

export interface Led {
  id: number;
  product_size_id: number;
  hole_id: number;
  position: number;
}

export interface Layout {
  id: number;
  product_id: number;
  name: string;
  instagram_caption: string | null;
  is_mirrored: boolean;
  is_listed: boolean;
  password: string | null;
  created_at: string;
}

export interface PlacementRole {
  id: number;
  product_id: number;
  position: number;
  name: string;
  full_name: string;
  led_color: string;
  screen_color: string;
}

export interface Set {
  id: number;
  name: string;
  hsm: number;
}

export interface ProductsAngle {
  product_id: number;
  angle: number;
}

export interface BetaLink {
  climb_uuid: string;
  link: string;
  foreign_username: string | null;
  angle: number | null;
  thumbnail: string | null;
  is_listed: boolean;
  created_at: string;
}

export interface ProductSizesLayoutsSet {
  id: number;
  product_size_id: number;
  layout_id: number;
  set_id: number;
  image_filename: string | null;
  is_listed: boolean;
}

export interface SharedSync {
  table_name: string;
  last_synchronized_at: string;
}
export type SyncPutFields =
  | User
  | Wall
  | WallExpungement
  | Ascent
  | UserSync
  | Climb
  | ClimbStats
  | SharedSync
  | Attempt
  | Product
  | ProductSize
  | Hole
  | Led
  | Layout
  | PlacementRole
  | Set
  | ProductsAngle
  | BetaLink
  | ProductSizesLayoutsSet;

export interface SyncDataPUT extends Record<string, Array<SyncPutFields>> {
  users: User[];
  walls: Wall[];
  wall_expungements: WallExpungement[];
  ascents: Ascent[];
  user_syncs: UserSync[];
  climbs: Climb[];
  climb_stats: ClimbStats[];
  shared_syncs: SharedSync[];
  attempts: Attempt[];
  products: Product[];
  product_sizes: ProductSize[];
  holes: Hole[];
  leds: Led[];
  layouts: Layout[];
  placement_roles: PlacementRole[];
  sets: Set[];
  products_angles: ProductsAngle[];
  beta_links: BetaLink[];
  product_sizes_layouts_sets: ProductSizesLayoutsSet[];
}

export interface Climb {
  uuid: string;
  name: string;
  description: string;
  hsm: number;
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  frames_count: number;
  frames_pace: number;
  frames: string;
  setter_id: number;
  setter_username: string;
  layout_id: number;
  is_draft: boolean;
  is_listed: boolean;
  created_at: string;
  updated_at: string;
  angle: number;
}

export interface SyncData extends Record<string, unknown> {
  PUT?: SyncDataPUT;
  _complete?: boolean;
  climbs?: Climb[];
  climb_stats?: ClimbStats[];
  shared_syncs?: SharedSync[];
  user_syncs?: UserSync[];
  users?: User[];
  walls?: Wall[];
  wall_expungements?: WallExpungement[];
  ascents?: Ascent[];
  attempts?: Attempt[];
  products?: Product[];
  product_sizes?: ProductSize[];
  holes?: Hole[];
  leds?: Led[];
  layouts?: Layout[];
  placement_roles?: PlacementRole[];
  sets?: Set[];
  products_angles?: ProductsAngle[];
  beta_links?: BetaLink[];
  product_sizes_layouts_sets?: ProductSizesLayoutsSet[];
}
