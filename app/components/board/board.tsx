import React from "react";
import BoardRenderer from "./board-renderer";
import { BoulderProblem, GetBoardDetailsResponse, ParsedBoardRouteParametersWithUuid } from "@/lib/types";
import Row from "antd/es/row";
import Col from "antd/es/col";
import Title from "antd/es/typography/Title";
import BoardHeaderRow from "./board-header-row";

type BoardWithLayoutProps = {
  routeParams: ParsedBoardRouteParametersWithUuid;
  currentClimb: BoulderProblem;
  boardDetails: GetBoardDetailsResponse;
  children: React.ReactNode;
}

const Board = ({ currentClimb, boardDetails, routeParams: {board_name}, children }: BoardWithLayoutProps) => {
  return (
    <>
      <BoardHeaderRow currentClimb={currentClimb}/>

      <Row justify="space-between" align="middle" style={{ width: "100%" }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8} style={{ textAlign: "center", height: "72dvh" }}>
          <BoardRenderer boardDetails={boardDetails} board_name={board_name}>
            {children}
          </BoardRenderer>
        </Col>
      </Row>
    </>
  );
};

export default Board;
