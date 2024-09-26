import { PropsWithChildren } from "react";
import { Layout } from "antd";
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/util"; // Assume this utility helps with parsing

import { Content, Footer, Header } from "antd/es/layout/layout";
import HistoryControlBar from "@/app/components/board-control/history-control-bar";
import { fetchBoardDetails } from "@/app/components/rest-api/api";
import BoardSeshHeader from "@/app/components/board-page/header";
import { QueueProvider } from "@/app/components/board-control/queue-context";

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default async function BoardLayout({ children, params }: PropsWithChildren<LayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);
  const { board_name, layout_id, size_id, set_ids, angle, uuid } = parsedParams;
  const boardDetails = await fetchBoardDetails(board_name, layout_id, size_id, set_ids);
  
  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <QueueProvider>
          <BoardSeshHeader params={parsedParams} />
            <Content style={{ height: "80dvh", justifyContent: "center", alignItems: "center" }}>
              {children} {/* This will render the dynamic content from the child pages */}
            </Content>

            <Footer style={{ height: "10dvh", padding: 0, backgroundColor: "#fff" }}>
              <HistoryControlBar
                board={board_name}
                boardDetails={boardDetails}
                
                // navigateClimbsLeft={navigateClimbsLeft}
                // navigateClimbsRight={navigateClimbsRight}
              />
            </Footer>
        </QueueProvider>
        
      </Layout>
    </>
  );
}
