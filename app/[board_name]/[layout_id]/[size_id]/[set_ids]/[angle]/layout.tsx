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
   
  // Fetch the climbs and board details server-side
  const [ boardDetails ] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    ]);
  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <QueueProvider parsedParams={parsedParams}>
          <BoardSeshHeader params={parsedParams} />
          <Content id="content-for-scrollable" style={{ 
            flex: 1, 
            justifyContent: "center", 
            alignItems: "center", 
            overflowY: "auto", 
            overflowX: 'hidden',
            height: "80vh", 
            paddingLeft: "18px",
            paddingRight: "18px",
            paddingTop: "18px",
            
            }}>
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
