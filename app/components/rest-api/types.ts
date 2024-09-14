// types.ts

export type BoulderProblem = {
  uuid: string;
  setter: string;
  name: string;
  instructions: string;
  holds: string[];
  angle: number;
  ascents: number;
  grade: string;
  gradeAdjustment: string;
  stars: number;
  mystery2: any; // Adjust this type based on what `row[10]` represents
};

// Layout Type
export type Layout = {
  id: number;
  name: string;
};

// Size Type
export type Size = {
  id: number;
  name: string;
  description: string;
};

// Set Type
export type Set = {
  id: number;
  name: string;
};

// Search Request Type
export type SearchRequest = {
  gradeAccuracy: number;
  layout: string;
  maxGrade: number;
  minAscents: number;
  minGrade: number;
  minRating: number;
  size: number;
  sortBy: "ascents" | "difficulty" | "name" | "quality";
  sortOrder: "asc" | "desc";
  pageSize: number;
  page: number;
  name: string;
  angle: number;
  onlyClassics: boolean;
  settername: string;
  setternameSuggestion: string;
  holds: string;
  mirroredHolds: string;
};

// Search Result Type
export type SearchResult = {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: number;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: number;
  difficulty_error: number;
  benchmark_difficulty: number;
};

// Led Colors Type
export type LedColor = {
  [role_id: number]: string;
};

// Grade Type
export type Grade = {
  difficulty: number;
  boulder_name: string;
};

// Beta Link Type
export type BetaLink = {
  angle: number;
  foreign_username: string;
  link: string;
};

// Login Request Type
export type LoginRequest = {
  board: string;
  username: string;
  password: string;
};

// Login Response Type
export type LoginResponse = {
  token: string;
  user_id: number;
};

// Responses

export type GetLayoutsResponse = Layout[];

export type GetSizesResponse = Size[];

export type GetSetsResponse = Set[];

export type SearchCountRequest = {
  gradeAccuracy: number;
  layout: string;
  maxGrade: number;
  minAscents: number;
  minGrade: number;
  minRating: number;
  size: number;
};

export type SearchCountResponse = number;

export type GetSearchResultsResponse = SearchResult[];

// Holds Type
export type Hold = {
  id: number;
  mirrored_id: number;
  x: number;
  y: number;
};

// Define a tuple type for each hold
export type HoldTuple = [number, number | null, number, number];

// Ensure imagesToHolds is typed as a Record where each key maps to an array of HoldTuples
export type ImagesToHolds = Record<string, HoldTuple[]>;
export type GetBoardDetailsResponse = {
  images_to_holds: ImagesToHolds;
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
};

export type GetLedColorsResponse = LedColor;

export type GetAnglesResponse = { angle: number }[];

export type GetGradesResponse = Grade[];

export type GetBetaResponse = BetaLink[];
