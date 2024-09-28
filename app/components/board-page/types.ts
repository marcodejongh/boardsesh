"use client";
import type { Angle, BoardName, BoulderProblem, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";

export interface FloatingBarProps {
  boardDetails: GetBoardDetailsResponse;
  board: BoardName;
}


