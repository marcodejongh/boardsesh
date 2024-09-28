'use client';

import useSWRInfinite from "swr/infinite";
import { Row, Col, Typography, Skeleton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import { SearchRequestPagination, BoulderProblem, ParsedBoardRouteParameters, GetBoardDetailsResponse, ParsedBoardRouteParametersWithUuid, ClimbUuid, BoardRouteParameters } from "@/app/lib/types";
import { PAGE_LIMIT } from "./constants";
import { useQueueContext } from "../board-control/queue-context";
import ClimbCard from "../climb-card/climb-card";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { useParams } from "next/navigation";
import BoardLitupHolds from "../board/board-litup-holds";

const { Title } = Typography;

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: GetBoardDetailsResponse;
};

type BoardPreviewProps = { 
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParametersWithUuid;
  setCurrentClimb: (climb: BoulderProblem) => void;
  boardDetails: GetBoardDetailsResponse;
}

const ClimbsList = ({
  boardDetails,
}: ClimbsListProps) => {
  // SWR fetcher function for client-side fetching
  const { setCurrentClimb, climbSearchResults, hasMoreResults, fetchMoreClimbs } = useQueueContext();
  const parsedParams = parseBoardRouteParams(useParams<BoardRouteParameters>());
  
  return (
      <InfiniteScroll
        dataLength={climbSearchResults.length}
        next={fetchMoreClimbs}
        hasMore={hasMoreResults}
        loader={<Skeleton active />}
        endMessage={<div style={{ textAlign: "center" }}>No more climbs 🤐</div>}
        // Probably not how this should be done in a React app, but it works and I ain't no CSS-wizard
        scrollableTarget="content-for-scrollable"
      >
        <Row gutter={[16, 16]}>
          {climbSearchResults.map((climb) => (
            <Col xs={24} lg={12} xl={12} key={climb.uuid}>
              <ClimbCard 
                setCurrentClimb={setCurrentClimb}
                parsedParams={parsedParams}
                climb={climb}
                boardDetails={boardDetails} 
                clickable
              >
                <BoardLitupHolds holdsData={boardDetails.holdsData} litUpHoldsMap={climb.litUpHoldsMap} />
              </ClimbCard>
            </Col>
            )
          )}
        </Row>
      </InfiniteScroll>
  );
};

export default ClimbsList;
