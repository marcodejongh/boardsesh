"use client";
import type { Board, BoulderProblem, Layout, SearchRequest, Size } from "@/lib/types";
import type { SetIds } from "../kilter-board/board-data";

export type ResultPageProps = {
  board: Board;
  layout: Layout;
  size: Size;
  hostId?: string;
  pathname: string;
  search: string;
};

export interface FloatingBarProps {
  currentClimb: BoulderProblem;
  navigateClimbsLeft: () => void;
  navigateClimbsRight: () => void;
  board: Board;
  layout: Layout;
  size: Size;
}


export type FilterDrawerProps = {
  currentClimb?: BoulderProblem;
  climbs: BoulderProblem[];
  handleClimbClick: (newClimb: BoulderProblem) => void;
  onClose: () => void;
  onApplyFilters: (filters: Partial<SearchRequest>) => void;
  open: boolean;
  currentSearchValues: SearchRequest;
  board: Board;
  layout: Layout;
  resultsCount: number;
  
};
