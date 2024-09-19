"use client";
import type { Angle, Board, BoulderProblem, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";
import type { SetIds } from "../kilter-board/board-data";

export type ResultPageProps = {
  board: Board;
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
  board: Board;
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
  board: Board;
  layout: LayoutId;
  angle: Angle;
  resultsCount: number;
  isFetching: boolean;
  searchChanged: boolean;
  fetchMoreClimbs: () => void;
};
