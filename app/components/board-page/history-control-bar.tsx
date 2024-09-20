"use client";
import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { FloatingBarProps } from "./types";
import Board from "../board/board";

const { Title, Text } = Typography;


const HistoryControlBar: React.FC<FloatingBarProps> = ({
  currentClimb,
  navigateClimbsLeft,
  navigateClimbsRight,
  boardDetails,
  board,
}: FloatingBarProps) => {
  if (!currentClimb) return null;

  return (
    <Card
      bodyStyle={{
        padding: '0', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      style={{
        width: '100%',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', // Add subtle shadow for separation
      }}
    >
      <Row justify="space-between" align="middle" style={{ width: '100%' }}>
        <Col xs={6}>
          {/* Board preview */}
          <div style={boardPreviewContainerStyle}>
            <Board
              boardDetails={boardDetails}
              board={board}
              litUpHolds={currentClimb.frames}
            />
          </div>
        </Col>
        <Col xs={12} style={{ textAlign: 'center' }}>
          <Title
            level={5}
            style={{
              marginBottom: 0,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentClimb.name}
          </Title>
          <Text
            style={{
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentClimb.difficulty} {currentClimb.quality_average}★ at {currentClimb.angle}°
          </Text>
        </Col>
        <Col xs={6} style={{ textAlign: "right" }}>
          {/* Navigation buttons */}
          <Button
            type="default"
            onClick={navigateClimbsLeft}
            icon={<LeftOutlined />}
            aria-label="Previous climb"
            style={{ marginRight: '4px' }}
          />
          <Button
            type="default"
            onClick={navigateClimbsRight}
            icon={<RightOutlined />}
            aria-label="Next climb"
          />
        </Col>
      </Row>
    </Card>
  );
};

const boardPreviewContainerStyle = {
  width: "80px", // Adjust the width and height for smaller screens
  height: "80px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

export default HistoryControlBar;
