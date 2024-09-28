import { notFound } from "next/navigation";
import { BoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { fetchBoardDetails, fetchCurrentClimb } from "@/app/components/rest-api/api";
import BoardLitupHolds from "@/app/components/board/board-litup-holds";
import ClimbCard from "@/app/components/climb-card/climb-card";
import { Col, Row } from "antd";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardRouteParametersWithUuid;
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    // Fetch the search results using searchBoulderProblems
    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams)
    ]);

    return (
      <Row >
        <Col xs={24} md={16}>
          <ClimbCard 
            parsedParams={parsedParams}
            climb={currentClimb}
            boardDetails={boardDetails} 
          >
            <BoardLitupHolds holdsData={boardDetails.holdsData} litUpHoldsMap={currentClimb.litUpHoldsMap} />
          </ClimbCard>
        </Col>
        <Col xs={24} md={8} style={{ marginBottom: "16px" }}>
          <h1>Test</h1>
        </Col>
      </Row>
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
