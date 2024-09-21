"use client";
import React, { useState } from "react";

import HistoryControlBar from "./history-control-bar";
import { Angle, BoardName, BoulderProblem, ClimbUuid, GetBoardDetailsResponse, LayoutId, SearchRequest, Size as SizeId } from "@/lib/types";
import { Button, Col, Layout, Row, Space, Typography } from "antd";
import { SetIdList } from "../board/board-data";
import {
  BulbOutlined,
} from "@ant-design/icons";
import { Footer } from "antd/es/layout/layout";
import Board from "../board/board";
import AngleButton from "./angle-button";
import InfoButton from "./info-button";
import FilterButton from "./filter-button";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
interface ResultsPageProps {
  board: BoardName;
  layoutId: LayoutId;
  sizeId: SizeId;
  setIdList: SetIdList;
  climb_uuid: ClimbUuid;
  angle: Angle;
  currentClimb: BoulderProblem;
  results: BoulderProblem[];
  resultsCount: number;
  initialQueryParameters: SearchRequest;
  boardDetails: GetBoardDetailsResponse;
}
const styles = {
  titleSize: "16px",
  textSize: "12px",
  padding: "0 8px",
};

const ResultsPage = (props: ResultsPageProps) => {
  const {
    board,
    layoutId,
    angle,
    currentClimb: initialClimb,
    boardDetails,
  } = props;

  const [currentClimb, setCurrentClimbState] = useState(initialClimb);

  return (
    <>
    <title>{`Boardsesh on ${board}: ${currentClimb.name} ${currentClimb.difficulty} @ ${currentClimb.angle}°`}</title>
     <Layout
      style={{
        height: "100dvh", // Full viewport height
        display: "flex",
        flexDirection: "column", // Vertical layout
        overflow: "hidden", // No scrolling
      }}
    >
      <Header
        style={{
          height: "10dvh", // Fixed height for the header
          background: "#fff",
          padding: "0 16px",
        }}
      >
        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
          <Col xs={6} sm={4} md={4} lg={4} xl={4}>
            {/* Left-aligned buttons */}
            <Space>
              <Button id="button-illuminate" type="default" icon={<BulbOutlined />} />
              <FilterButton
                {...props}
                currentClimb={currentClimb}
                setCurrentClimbState={setCurrentClimbState}
              />
            </Space>
          </Col>
          
          <Col xs={12} sm={16} md={16} lg={16} xl={16} style={{ textAlign: "center" }}>
            <Title
                level={4}
                style={{
                  margin: 0,
                  lineHeight: "1.2",
                }}
              >
                BoardSesh logo
              </Title>
          </Col>

          <Col xs={6} sm={4} md={4} lg={4} xl={4} style={{ textAlign: "right" }}>
            {/* Right-aligned buttons */}
            <Space>
              <AngleButton angle={angle} layout={layoutId} board={board} />
              <InfoButton angle={angle} layout={layoutId} board={board} currentClimb={currentClimb} />
            </Space>
          </Col>
        </Row>
      </Header>

       <Content
        style={{
          height: "80dvh", // Fixed height for the content to leave space for footer
          // display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden", // Prevent scrolling
        }}>         
          <Board
            currentClimb={currentClimb}
            boardDetails={boardDetails}
            board={board}
          />
        </Content>
        
       <Footer
        style={{
          height: "10dvh", // Fixed height for the footer (HistoryControlBar)
          padding: 0,
          backgroundColor: "#fff",
        }}
      >
        {currentClimb && (
          <HistoryControlBar
            board={board}
            boardDetails={boardDetails}
            currentClimb={currentClimb}
            // navigateClimbsLeft={navigateClimbsLeft}
            // navigateClimbsRight={navigateClimbsRight}
          />
        )}
      </Footer>
    </Layout>
  </>);
};

export default ResultsPage;
