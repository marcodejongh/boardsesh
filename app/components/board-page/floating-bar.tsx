import React from "react";
import { Button, Typography, Row, Col } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import KilterBoardLoader from "../kilter-board/loader"; // Import KilterBoardLoader
import { FloatingBarProps } from "./types";

const { Title, Text } = Typography;

const FloatingBar: React.FC<FloatingBarProps> = ({
  currentClimb,
  navigateClimbsLeft,
  navigateClimbsRight,
  board, layout, size
}: FloatingBarProps) => {
  if (!currentClimb) return null;

  return (
    <div style={fixedBarStyle}>
      <Row justify="start" align="top" gutter={16}>
        {/* KilterBoardLoader for small preview */}
        <Col>
          <div style={boardPreviewStyle}>
            <KilterBoardLoader
              board={board} 
              layout={layout}
              size={size}
              // TODO: Implement
              // showLargeOnClick={true}
              litUpHolds={currentClimb.frames} 
            />
          </div>
        </Col>
        <Col>
          <div style={climbPreviewStyle}>
            <Title level={5} style={{ marginBottom: 0 }}>
              {currentClimb.name}
            </Title>
            <Text>
              {currentClimb.difficulty} {currentClimb.quality_average}★ at {currentClimb.angle}°
            </Text>
          </div>
        </Col>
        <Col>
          <Button
            type="default"
            onClick={navigateClimbsLeft}
            icon={<LeftOutlined />}
          />
        </Col>
        <Col>
          <Button
            type="default"
            onClick={navigateClimbsRight}
            icon={<RightOutlined />}
          />
        </Col>
      </Row>
    </div>
  );
};

// Styles for the fixed bottom bar and board preview
const fixedBarStyle: React.CSSProperties = {
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  padding: "10px 20px",
  boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.1)",
  display: "flex",
  justifyContent: "left",
  alignItems: "left",
  zIndex: 1000,
};

const climbPreviewStyle: React.CSSProperties = {
  textAlign: "center", // Ensure it's a valid CSS value
};

const boardPreviewStyle = {
  width: "100px", // Small width for the board preview
  height: "100px", // Adjust height to maintain a small size
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

export default FloatingBar;
