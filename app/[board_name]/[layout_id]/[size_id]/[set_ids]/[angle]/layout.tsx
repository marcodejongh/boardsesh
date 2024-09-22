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
  
  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <Header
          style={{
            height: "8dvh", 
            background: "#fff", 
            padding: "0 16px"
          }}
        >
          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col xs={6} sm={4} md={4} lg={4} xl={4}>
              <Space>
                {/* {uuid === undefined ? <BackToClimbList {...parsedParams}/> : <FilterDrawer />} */}
                <FilterDrawer routeParams={parsedParams} />
                <Button id="button-illuminate" type="default" icon={<BulbOutlined />} />
              </Space>
            </Col>

            <Col xs={12} sm={16} md={16} lg={16} xl={16} style={{ textAlign: "center" }}>
              <Title level={4} style={{ margin: 0, lineHeight: "1.2" }}>
                BS
              </Title>
            </Col>

            <Col xs={6} sm={4} md={4} lg={4} xl={4} style={{ textAlign: "right" }}>
              <Space>
                <AngleButton angle={angle} layout={layout_id} board={board_name} />
                <InfoButton angle={angle} layout={layout_id} board={board_name} currentClimb={null} />
              </Space>
            </Col>
          </Row>
        </Header>

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
      </Layout>
    </>
  );
}
