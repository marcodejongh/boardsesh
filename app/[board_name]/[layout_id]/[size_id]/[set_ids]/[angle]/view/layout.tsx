import { PropsWithChildren } from "react";
import { BoardRouteParametersWithUuid, ParsedBoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils"; // Assume this utility helps with parsing

import { fetchBoardDetails, fetchCurrentClimb } from "@/app/components/rest-api/api";
import Board from "@/app/components/board/board";

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default async function BoardLayout({ children, params }: PropsWithChildren<LayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParametersWithUuid = parseBoardRouteParams(params);
  
  // Fetch the search results using searchBoulderProblems
  const [boardDetails, currentClimb] = await Promise.all([
    fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    fetchCurrentClimb(parsedParams)
  ]);
  
  return (  
    <Board
        currentClimb={currentClimb}
        boardDetails={boardDetails}
        routeParams={parsedParams}
      >
      {children}
    </Board>
  );
}
