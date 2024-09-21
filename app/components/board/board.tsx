// BoardWithLayout.tsx

import React from "react";
import { Col, Row, Typography, Layout } from "antd";
import BoardRenderer from "./board-renderer";
import { BoulderProblem, GetBoardDetailsResponse, BoardName } from "@/lib/types";

const { Title, Text } = Typography;
const { Content } = Layout;

interface BoardWithLayoutProps {
  currentClimb: BoulderProblem;
  boardDetails: GetBoardDetailsResponse;
  board: BoardName;
}

const Board = ({ currentClimb, boardDetails, board }: BoardWithLayoutProps) => {
  const styles = {
    titleSize: "16px",
    textSize: "12px",
    padding: "0 8px",
  };

  return (
    <>
      <Row justify="center" align="middle" style={{ width: "100%", height: "8vh", display: "flex" }}>
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={24}
          xl={24}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            overflow: "hidden", // Prevent overflow for long titles
          }}
        >
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
            {currentClimb.name}
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
        </Col>
      </Row>

      <Row justify="space-between" align="middle" style={{ width: "100%" }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8} style={{ textAlign: "center", height: "72dvh" }}>
          <BoardRenderer boardDetails={boardDetails} litUpHolds={currentClimb ? currentClimb.frames : ""} board={board} />
        </Col>
      </Row>
    </>
  );
};

export default Board;
