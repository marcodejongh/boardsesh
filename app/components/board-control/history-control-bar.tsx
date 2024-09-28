"use client";
import React from "react";
import { Button, Typography, Row, Col, Card } from "antd";
import { LeftOutlined, RightOutlined, BulbOutlined } from "@ant-design/icons";
import { FloatingBarProps } from "../board-page/types";
import BoardRenderer from "../board/board-renderer";
import { useQueueContext } from "./queue-context";
import BoardLitupHolds from "../board/board-litup-holds";
import NextClimbButton from "./next-climb-button";
import { useParams, usePathname } from "next/navigation";
import PreviousClimbButton from "./previous-climb-button";
import Link from "next/link";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { BoardName, BoardRouteParametersWithUuid, BoulderProblem, GetBoardDetailsResponse } from "@/app/lib/types";

const { Title, Text } = Typography;

type BoardPreviewProps = {
  board: BoardName; 
  currentClimb: BoulderProblem | null;
  boardDetails: GetBoardDetailsResponse;
  
}

const BoardPreview = ({ boardDetails, board, currentClimb}: BoardPreviewProps) => (
   <BoardRenderer
    boardDetails={boardDetails}
    board_name={board}
  >
    {currentClimb && <BoardLitupHolds holdsData={boardDetails.holdsData} litUpHoldsMap={currentClimb.litUpHoldsMap} thumbnail />}
  </BoardRenderer>
)

const HistoryControlBar: React.FC<FloatingBarProps> = ({
  boardDetails,
  board,
}: FloatingBarProps) => {
  const pathname = usePathname();
  const { board_name, layout_id, size_id, set_ids, angle } = parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());
  
  const isViewPage = pathname.includes('/view/');

  const { currentClimb } = useQueueContext();
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
            { currentClimb ? (<Link
              href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${currentClimb.uuid}`}
            >
             <BoardPreview boardDetails={boardDetails} board={board} currentClimb={currentClimb}/>
            </Link>) : <BoardPreview boardDetails={boardDetails} board={board} currentClimb={currentClimb}/>}
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
          <PreviousClimbButton navigate={isViewPage} />
          <NextClimbButton navigate={isViewPage} />
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
