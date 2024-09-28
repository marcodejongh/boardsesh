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
  initialClimbs: BoulderProblem[];
  resultsCount: number;
  searchParams: SearchRequestPagination;
  boardDetails: GetBoardDetailsResponse;
};

type BoardPreviewProps = { 
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParametersWithUuid;
  setCurrentClimb: (climb: BoulderProblem) => void;
  boardDetails: GetBoardDetailsResponse;
}

const ClimbsList = ({
  initialClimbs,
  resultsCount,
  searchParams,
  boardDetails,
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle
}: ClimbsListProps) => {
  // SWR fetcher function for client-side fetching
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { setCurrentClimb, setSuggestedQueue, suggestedQueue } = useQueueContext();
  const parsedParams = parseBoardRouteParams(useParams<BoardRouteParameters>());
  
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && previousPageData.boulderproblems.length === 0) return null;

    const queryString = new URLSearchParams({
      gradeAccuracy: searchParams.gradeAccuracy.toString(),
      maxGrade: searchParams.maxGrade.toString(),
      minAscents: searchParams.minAscents.toString(),
      minGrade: searchParams.minGrade.toString(),
      minRating: searchParams.minRating.toString(),
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
      name: searchParams.name,
      onlyClassics: searchParams.onlyClassics.toString(),
      settername: searchParams.settername,
      setternameSuggestion: searchParams.setternameSuggestion,
      holds: searchParams.holds,
      mirroredHolds: searchParams.mirroredHolds,
      pageSize: searchParams.pageSize.toString(),
      page: pageIndex.toString(),
    }).toString();

    return `/api/v1/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/search?${queryString}`
  };

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    getKey,
    fetcher,
    { 
      fallbackData: [{ boulderproblems: initialClimbs, totalCount: resultsCount }],
      revalidateOnFocus: false, 
      revalidateFirstPage: false 
    }
  );
  
  const hasMore = !!(data && data[data.length - 1]?.boulderproblems.length === PAGE_LIMIT);
  
  // Aggregate all pages of climbs
  const allClimbs = data ? data.flatMap((page) => page.boulderproblems) : initialClimbs;
  
  if (!suggestedQueue || suggestedQueue.length === 0) {
    setSuggestedQueue(allClimbs);
  }

  return (
    <div id="scrollableDiv" style={{ height: "80vh", padding: "0 16px", border: "1px solid rgba(140, 140, 140, 0.35)" }}>
      <InfiniteScroll
        dataLength={allClimbs.length}
        next={() => setSize(size + 1)}
        hasMore={hasMore}
        loader={<Skeleton active />}
        endMessage={<div style={{ textAlign: "center" }}>No more climbs 🤐</div>}
        scrollableTarget="scrollableDiv"
      >
        <Row gutter={[16, 16]}>
          {allClimbs.map((climb) => (
            <Col xs={24} lg={12} xl={12} key={climb.uuid}>
              <ClimbCard 
                setCurrentClimb={setCurrentClimb}
                parsedParams={parsedParams}
                climb={climb}
                boardDetails={boardDetails} 
              >
                <BoardLitupHolds holdsData={boardDetails.holdsData} litUpHoldsMap={climb.litUpHoldsMap} />
              </ClimbCard>
            </Col>)
          )}
        </Row>
      </InfiniteScroll>
    </div>
  );
};

export default ClimbsList;
