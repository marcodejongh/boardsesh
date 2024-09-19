"use client";
import type { Angle, BoardName, BoulderProblem, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";
import type { SetIds } from "../board/board-data";

export type ResultPageProps = {
  board: BoardName;
  layout: LayoutId;
  size: Size;
  hostId: string;
  pathname: string;
  search: string;
};

export interface FloatingBarProps {
  currentClimb: BoulderProblem;
  navigateClimbsLeft: () => void;
  navigateClimbsRight: () => void;
  boardDetails: GetBoardDetailsResponse;
  board: BoardName;
}


export type FilterDrawerProps = {
  currentClimb?: BoulderProblem;
  climbs: BoulderProblem[];
  handleClimbClick: (newClimb: BoulderProblem) => void;
  onClose: () => void;
  closeDrawer: () => void;
  onApplyFilters: (filters: SearchRequest) => void;
  open: boolean;
  currentSearchValues: SearchRequest;
  board: BoardName;
  layout: LayoutId;
  angle: Angle;
  resultsCount: number;
  isFetching: boolean;
  searchChanged: boolean;
  fetchMoreClimbs: () => void;
};
