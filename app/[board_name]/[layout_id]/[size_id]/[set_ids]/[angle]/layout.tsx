import { PropsWithChildren } from "react";
import { Affix, Layout } from "antd";
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils"; // Assume this utility helps with parsing

import { Content } from "antd/es/layout/layout";
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
        <QueueProvider parsedParams={params}>
          <BoardSeshHeader params={parsedParams} />
          <Content id="content-for-scrollable" style={{ flex: 1, justifyContent: "center", alignItems: "center", overflowY: "auto" }}>
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
