import { PropsWithChildren } from "react";
import { Layout } from "antd";
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/util"; // Assume this utility helps with parsing
import { Button, Col, Row, Space, Typography } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import AngleButton from "@/app/components/board-page/angle-button";
import InfoButton from "@/app/components/board-page/info-button";

import { Content, Footer, Header } from "antd/es/layout/layout";
import HistoryControlBar from "@/app/components/board-page/history-control-bar";
import { fetchBoardDetails } from "@/app/components/rest-api/api";
import Title from "antd/es/typography/Title";
import BackToClimbList from "@/app/components/board-page/back-to-climb-list-button";
import FilterDrawer from "@/app/components/filter-drawer/filter-drawer";
import BoardSeshHeader from "@/app/components/board-page/header";
import { PlaylistProvider } from "@/app/components/playlist-control/playlist-context";

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default async function BoardLayout({ children, params }: PropsWithChildren<LayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);
  const { board_name, layout_id, size_id, set_ids, angle, uuid } = parsedParams;
  const [ boardDetails ] = await Promise.all([
    fetchBoardDetails(board_name, layout_id, size_id, set_ids),
  ]);
  debugger;
  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <PlaylistProvider>
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
        </PlaylistProvider>
        
      </Layout>
    </>
  );
}
