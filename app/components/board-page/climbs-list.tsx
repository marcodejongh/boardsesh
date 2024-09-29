'use client';

import useSWRInfinite from "swr/infinite";
import { Row, Col, Typography, Skeleton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import { SearchRequestPagination, BoulderProblem, ParsedBoardRouteParameters, BoardDetails, ParsedBoardRouteParametersWithUuid, ClimbUuid, BoardRouteParameters } from "@/app/lib/types";
import { PAGE_LIMIT } from "./constants";
import { useQueueContext } from "../board-control/queue-context";
import ClimbCard from "../climb-card/climb-card";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { useParams } from "next/navigation";
import BoardLitupHolds from "../board-renderer/board-litup-holds";
import BoardRenderer from "../board-renderer/board-renderer";

const { Title } = Typography;

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: BoulderProblem[];
};

const ClimbsList = ({
  boardDetails,
  initialClimbs,
}: ClimbsListProps) => {
  const { setCurrentClimb, climbSearchResults, hasMoreResults, fetchMoreClimbs, addToQueue } = useQueueContext();
  const parsedParams = parseBoardRouteParams(useParams<BoardRouteParameters>());
  
  // Queue Context provider uses SWR infinite to fetch results, which can only happen clientside.
  // That data equals null at the start, so when its null we use the initialClimbs array which we
  // fill on the server side in the page component. This way the user never sees a loading state for
  // the climb list.
  const climbs = climbSearchResults === null ? initialClimbs : climbSearchResults;

  return (
      <InfiniteScroll
        dataLength={climbs.length}
        next={fetchMoreClimbs}
        hasMore={hasMoreResults}
        loader={<Skeleton active />}
        endMessage={<div style={{ textAlign: "center" }}>No more climbs 🤐</div>}
        // Probably not how this should be done in a React app, but it works and I ain't no CSS-wizard
        scrollableTarget="content-for-scrollable"
      >
        <Row gutter={[16, 16]}>
          {climbs.map((climb) => (
            <Col xs={24} lg={12} xl={12} key={climb.uuid}>
              <ClimbCard 
                setCurrentClimb={setCurrentClimb}
                addToQueue={addToQueue}
                parsedParams={parsedParams}
                climb={climb}
                boardDetails={boardDetails} 
                clickable
              >
                <BoardRenderer 
                  boardDetails={boardDetails} 
                  board_name={parsedParams.board_name} 
                  holdsData={boardDetails.holdsData} 
                  litUpHoldsMap={climb.litUpHoldsMap}  />
              </ClimbCard>
            </Col>
            )
          )}
        </Row>
      </InfiniteScroll>
  );
};

export default ClimbsList;
