"use client";
import React, { useEffect, useState } from "react";

import FilterDrawer from "./FilterDrawer";
import HistoryControlBar from "./history-control-bar";
import { Angle, BoardName, BoulderProblem, ClimbUuid, GetBoardDetailsResponse, LayoutId, SearchRequest, Size as SizeId } from "@/lib/types";
import { Button, Col, Layout, message, Row, Space, Typography } from "antd";
import { SetIdList } from "../board/board-data";
import {
  SearchOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { Footer } from "antd/es/layout/layout";
import Board from "../board/board";
import { fetchResults } from "../rest-api/api";
import { PAGE_LIMIT } from "./constants";
import AngleButton from "./angle-button";
import InfoButton from "./info-button";
import { useSwipeable } from "react-swipeable";
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

const ResultsPage = (props: ResultsPageProps) => {
const {
  board,
  layoutId,
  angle,
  currentClimb: initialClimb,
  boardDetails,
} = props;

  const [currentClimb, setCurrentClimbState] = useState(initialClimb);
  const styles = {
    titleSize: "16px",
    textSize: "12px",
    padding: "0 8px",
  };

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
          height: "7dvh", // Fixed height for the header
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
          height: "70dvh", // Fixed height for the content to leave space for footer
          // display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden", // Prevent scrolling
        }}>
       <Row justify="center" align="middle" style={{ width: "100%", height: '8vh', display: 'flex' }}>
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={24}
          xl={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: "center",
            overflow: 'hidden', // Prevent overflow for long titles
          }}
        >
            <>
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: styles.titleSize,
                  lineHeight: "1.2",
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Hide overflow for long titles
                  textOverflow: "ellipsis", // Add ellipsis for long titles
                  width: "100%", // Take up the full width of the flex container
                  maxWidth: "100%", // Ensure it doesn't overflow outside
                }}
              >
                <a
                  href={`https://kilterboardapp.com/climbs/${currentClimb.uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden", // Prevent text from overflowing
                    textOverflow: "ellipsis", // Show ellipsis for long titles
                    fontSize: styles.titleSize,
                  }}
                >
                  {currentClimb.name}
                </a>
              </Title>
              <Text
                style={{
                  display: "block",
                  fontSize: styles.textSize,
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Prevent overflow for long setter names
                  textOverflow: "ellipsis",
                }}
              >
                by {currentClimb.setter_username}
              </Text>
              <Text
                style={{
                  display: "block",
                  fontSize: styles.textSize,
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Prevent overflow for other information
                  textOverflow: "ellipsis",
                }}
              >
                {currentClimb.difficulty} {currentClimb.quality_average}★ @ {currentClimb.angle}°
              </Text>
            </>
          
        </Col>
      </Row>

          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col xs={24} sm={20} md={16} lg={12} xl={8} style={{ textAlign: "center", height: '75dvh' }}>
              <Board
                boardDetails={boardDetails}
                litUpHolds={currentClimb ? currentClimb.frames : ""}
                board={board}
              />
            </Col>
          </Row>
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
