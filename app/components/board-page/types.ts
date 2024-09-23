"use client";
import type { Angle, BoardName, BoulderProblem, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";

export interface FloatingBarProps {
  currentClimb: BoulderProblem;
  navigateClimbsLeft?: () => void;
  navigateClimbsRight?: () => void;
  boardDetails: GetBoardDetailsResponse;
  board: BoardName;
}


