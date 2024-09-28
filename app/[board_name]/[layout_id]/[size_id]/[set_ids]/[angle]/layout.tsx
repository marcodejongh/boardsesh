import { PropsWithChildren } from "react";
import { Affix, Layout } from "antd";
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid, SearchRequestPagination } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils"; // Assume this utility helps with parsing

import { Content } from "antd/es/layout/layout";
import HistoryControlBar from "@/app/components/board-control/history-control-bar";
import { fetchBoardDetails, fetchResults } from "@/app/components/rest-api/api";
import BoardSeshHeader from "@/app/components/board-page/header";
import { QueueProvider } from "@/app/components/board-control/queue-context";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
  searchParams: {
    query?: string;
    page?: string;
    gradeAccuracy?: string;
    maxGrade?: string;
    minAscents?: string;
    minGrade?: string;
    minRating?: string;
    sortBy?: string;
    sortOrder?: string;
    name?: string;
    onlyClassics?: string;
    settername?: string;
    setternameSuggestion?: string;
    holds?: string;
    mirroredHolds?: string;
    pageSize?: string;
  }
}

export default async function BoardLayout({ children, params, searchParams = {} }: PropsWithChildren<LayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  const { board_name, layout_id, size_id, set_ids, angle, uuid } = parsedParams;
   
  // TODO: Unduplicate this code
  const searchParamsObject: SearchRequestPagination = {
      gradeAccuracy: parseFloat(searchParams.gradeAccuracy || "0"),
      maxGrade: parseInt(searchParams.maxGrade || "29", 10),
      minAscents: parseInt(searchParams.minAscents || "0", 10),
      minGrade: parseInt(searchParams.minGrade || "1", 10),
      minRating: parseFloat(searchParams.minRating || "0"),
      sortBy: (searchParams.sortBy || "ascents") as "ascents" | "difficulty" | "name" | "quality",
      sortOrder: (searchParams.sortOrder || "desc") as "asc" | "desc",
      name: searchParams.name || "",
      onlyClassics: searchParams.onlyClassics === "true",
      settername: searchParams.settername || "",
      setternameSuggestion: searchParams.setternameSuggestion || "",
      holds: searchParams.holds || "",
      mirroredHolds: searchParams.mirroredHolds || "",
      pageSize: Number(searchParams.pageSize || PAGE_LIMIT),
      page: Number(searchParams.page || 0),
    };
  // Fetch the climbs and board details server-side
  const [fetchedResults, boardDetails] = await Promise.all([
      fetchResults(searchParamsObject, parsedParams),
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    ]);
  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <QueueProvider parsedParams={parsedParams} initialClimbSearchResults={fetchedResults.boulderproblems} initialClimbSearchTotalCount={fetchedResults.totalCount}>
          <BoardSeshHeader params={parsedParams} />
          <Content id="content-for-scrollable" style={{ flex: 1, justifyContent: "center", alignItems: "center", overflowY: "auto", overflowX: 'hidden' }}>
            {children}
          </Content>

          <Affix offsetBottom={0}>
            <div style={{ width: "100%", backgroundColor: "#fff", boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.15)" }}>
              <HistoryControlBar
                board={board_name}
                boardDetails={boardDetails}
              />
            </div>
          </Affix>
        </QueueProvider>
      </Layout>
    </>
  );
}
