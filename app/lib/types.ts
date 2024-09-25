import { HoldRenderData, LitUpHoldsMap } from "../components/board/types";
import { SetIdList } from "./board-data";

export type BoulderProblem = {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: string;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: string;
  stars: number;
  difficulty_error: string;
  litUpHoldsMap: LitUpHoldsMap;
};

export type ClimbQueryResult = {
  uuid: string; // UUID of the climb
  setter_username: string; // Username of the setter
  name: string; // Name of the climb
  description: string; // Description of the climb
  frames: string; // Holds and placement frames for the climb
  angle: number; // Angle of the climb
  ascensionist_count: number; // Number of people who completed the climb
  difficulty: string | null; // Difficulty grade of the climb, can be null
  quality_average: number; // Average quality rating of the climb
  difficulty_error: string; // Difficulty error, represented as a string (e.g., "0.00")
  benchmark_difficulty: string | null; // Benchmark difficulty, can be null
};

// Example of an array of ClimbQueryResult
export type ClimbQueryResults = ClimbQueryResult[];

// Layout Type
export type LayoutsResponse = {
  id: number;
  name: string;
};

// Size Type
export type SizesResponse = {
  id: number;
  name: string;
  description: string;
};

// Set Type
export type SetsResponse = {
  id: number;
  name: string;
};

// Search Request Type
export type SearchRequest = {
  gradeAccuracy: number;
  maxGrade: number;
  minAscents: number;
  minGrade: number;
  minRating: number;
  sortBy: "ascents" | "difficulty" | "name" | "quality";
  sortOrder: "asc" | "desc";
  name: string;
  onlyClassics: boolean;
  settername: string;
  setternameSuggestion: string;
  holds: string;
  mirroredHolds: string;
};

export type SearchRequestPagination = SearchRequest & {
  page: number;
  pageSize: number;
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
  difficulty_id: number;
  difficulty_name: string;
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

export type GetLayoutsResponse = LayoutsResponse[];

export type GetSizesResponse = SizesResponse[];

export type GetSetsResponse = SetsResponse[];

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
  holdsData: HoldRenderData[];
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  boardHeight: number;
  boardWidth: number;
};

export type GetLedColorsResponse = LedColor;

export type GetAnglesResponse = { angle: number }[];

export type GetGradesResponse = Grade[];

export type GetBetaResponse = BetaLink[];

export type BoardRouteParameters = {
  board_name: string;
  layout_id: string;
  size_id: string;
  set_ids: string;
  angle: string;
  climb_uuid?: string;
};

export type ParsedBoardRouteParameters = {
  board_name: BoardName;
  layout_id: number;
  size_id: number;
  set_ids: SetIdList;
  angle: number;
  uuid?: string;
};

export type ParsedBoardRouteParametersWithUuid = ParsedBoardRouteParameters & {
  climb_uuid: ClimbUuid;
};

export type ClimbUuid = string;
export type BoardRouteParametersWithUuid = BoardRouteParameters & {
  climb_uuid: ClimbUuid;
};
//TODO: Refactor useEffects so this page can SSR

export type BoardName = 'kilter' | 'tension';
export type LayoutId = number;
export type Angle = number;
export type Size = number;
export type FetchResultsResponse = {
  rows: BoulderProblem[];
  totalCount: number;
};

export type FetchCurrentProblemResponse = BoulderProblem;

export interface ErrorResponse {
  error: string;
}
