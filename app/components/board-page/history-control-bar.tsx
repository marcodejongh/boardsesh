"use client";
import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { LeftOutlined, RightOutlined, BulbOutlined } from "@ant-design/icons";
import { FloatingBarProps } from "./types";
import BoardRenderer from "../board/board-renderer";

const { Title, Text } = Typography;


const HistoryControlBar: React.FC<FloatingBarProps> = ({
  currentClimb,
  boardDetails,
  board,
}: FloatingBarProps) => {
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
            <BoardRenderer
              boardDetails={boardDetails}
              board_name={board}
              litUpHolds={currentClimb && currentClimb.frames}
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
            {currentClimb && currentClimb.name ? currentClimb.name : 'No climb selected'}
          </Title>
          <Text
            style={{
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentClimb && currentClimb.name ? `${currentClimb.difficulty} ${currentClimb.quality_average}★ @ ${currentClimb.angle}°` : 'No climb selected'}
            <Button id="button-illuminate" type="default" icon={<BulbOutlined />} />
          </Text>
        </Col>
        <Col xs={6} style={{ textAlign: "right" }}>
          {/* Navigation buttons */}
          <Button
            type="default"
            icon={<LeftOutlined />}
            aria-label="Previous climb"
            style={{ marginRight: '4px' }}
          />
          <Button
            type="default"
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
