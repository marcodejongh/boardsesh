// Favorites types

export type ToggleFavoriteInput = {
  boardName: string;
  climbUuid: string;
  angle: number;
};

export type ToggleFavoriteResult = {
  favorited: boolean;
};
