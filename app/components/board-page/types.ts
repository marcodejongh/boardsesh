"use client";
import type { Angle, Board, BoulderProblem, GetBoardDetailsResponse, Layout, SearchRequest, Size } from "@/lib/types";
import type { SetIds } from "../kilter-board/board-data";

export type ResultPageProps = {
  board: Board;
  layout: Layout;
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
  layout: Layout;
  angle: Angle;
  resultsCount: number;
  isFetching: boolean;
  searchChanged: boolean;
  fetchMoreClimbs: () => void;
};
