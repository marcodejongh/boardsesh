"use client";
import React, { useState } from "react";
import { Button, Typography, Row, Col, Card, Drawer, Space } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import BoardRenderer from "../board-renderer/board-renderer";
import { useQueueContext } from "./queue-context";
import NextClimbButton from "./next-climb-button";
import { useParams, usePathname } from "next/navigation";
import PreviousClimbButton from "./previous-climb-button";
import Link from "next/link";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { BoardName, BoardRouteParametersWithUuid, BoulderProblem, BoardDetails } from "@/app/lib/types";
import QueueList from "./queue-list";

const { Title, Text } = Typography;

export interface HistoryControlBar {
  boardDetails: BoardDetails;
  board: BoardName;
}

type BoardPreviewProps = {
  board: BoardName; 
  currentClimb: BoulderProblem | null;
  boardDetails: BoardDetails;
}

export const BoardPreview = ({ boardDetails, board, currentClimb }: BoardPreviewProps) => (
   <BoardRenderer
      holdsData={boardDetails.holdsData}
      litUpHoldsMap={currentClimb ? currentClimb.litUpHoldsMap : undefined}
      boardDetails={boardDetails} 
      board_name={board}
      thumbnail
    />
)

const HistoryControlBar: React.FC<HistoryControlBar> = ({
  boardDetails,
  board,
}: HistoryControlBar) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false); // State to control drawer
  const pathname = usePathname();
  const { board_name, layout_id, size_id, set_ids, angle } = parseBoardRouteParams(useParams<BoardRouteParametersWithUuid>());
  
  const isViewPage = pathname.includes('/view/');
  const { currentClimb } = useQueueContext(); // Assuming `queue` exists in context
  
  // Function to toggle drawer visibility
  const toggleQueueDrawer = () => setIsQueueOpen(!isQueueOpen);

  return (
    <>
      {/* Main Control Bar */}
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
          <Col xs={4}>
            {/* Board preview */}
            <div style={boardPreviewContainerStyle}>
              { currentClimb ? (
                <Link href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${currentClimb.uuid}`}>
                  <BoardPreview boardDetails={boardDetails} board={board} currentClimb={currentClimb}/>
                </Link>
              ) : (
                <BoardPreview boardDetails={boardDetails} board={board} currentClimb={currentClimb}/>
              )}
            </div>
          </Col>
          
          {/* Clickable main body for opening the queue */}
          <Col xs={10} style={{ textAlign: 'center' }}>
            <div onClick={toggleQueueDrawer} style={{ cursor: 'pointer' }}>
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
                {currentClimb ? `${currentClimb.difficulty} ${currentClimb.quality_average}★ @ ${currentClimb.angle}°` : 'No climb selected'}
              </Text>
            </div>
          </Col>

          {/* Button cluster */}
          <Col xs={10} style={{ textAlign: "right" }}>
            <Space>
              <PreviousClimbButton navigate={isViewPage} />
              <NextClimbButton navigate={isViewPage} />
              <Button id="button-tick" type="default" icon={<CheckCircleOutlined />} />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Drawer for showing the queue */}
      <Drawer
        title="Queue"
        placement="bottom"
        height="70%" // Adjust as per design preference
        open={isQueueOpen}
        onClose={toggleQueueDrawer}
      >
        <QueueList board={board_name} boardDetails={boardDetails} />
      </Drawer>
    </>
  );
};

const boardPreviewContainerStyle = {
  width: "100%", // Using 100% width for flexibility
  height: "auto", // Auto height to maintain aspect ratio
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

export default HistoryControlBar;
