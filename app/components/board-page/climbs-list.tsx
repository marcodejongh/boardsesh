'use client';

import useSWRInfinite from "swr/infinite";
import { List, Row, Col, Typography, Skeleton, Card } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import BoardRenderer from "../board/board-renderer";
import { SearchRequestPagination, BoulderProblem, ParsedBoardRouteParameters, GetBoardDetailsResponse } from "@/app/lib/types";
import { PAGE_LIMIT } from "./constants";
import Link from "next/link";
import { useSWRConfig } from "swr";
import BoardLitupHolds from "../board/board-litup-holds";
import { useQueueContext } from "../board-control/queue-context";
import { SettingOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Title } = Typography;

type ClimbsListProps = ParsedBoardRouteParameters & {
  initialClimbs: BoulderProblem[];
  resultsCount: number;
  searchParams: SearchRequestPagination;
  boardDetails: GetBoardDetailsResponse;
};

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
  
  if(!suggestedQueue || suggestedQueue.length === 0) {
    setSuggestedQueue(allClimbs);
  }
  const boardPreview = (climb: BoulderProblem) => (
    <Link onClick={() => { setCurrentClimb(climb) }} href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${climb.uuid}`}>
      <BoardRenderer boardDetails={boardDetails} board_name={board_name}>
        <BoardLitupHolds holdsData={boardDetails.holdsData} litUpHoldsMap={climb.litUpHoldsMap} />
      </BoardRenderer>
    </Link>
    )
  
  return (
    <div id="scrollableDiv" style={{ height: "80vh", overflow: "auto", padding: "0 16px", border: "1px solid rgba(140, 140, 140, 0.35)" }}>
      <InfiniteScroll
        dataLength={allClimbs.length}
        next={() => setSize(size + 1)}
        hasMore={hasMore}
        loader={<Skeleton active />}
        endMessage={<div style={{ textAlign: "center" }}>No more climbs 🤐</div>}
        scrollableTarget="scrollableDiv"
      >
        <List
          itemLayout="vertical"
          dataSource={allClimbs}
          bordered={false}
          renderItem={(climb) => (
            <List.Item key={climb.uuid}>
              <Card size="small" title={climb.name} cover={boardPreview(climb)} actions={[
                  <SettingOutlined key="setting" />,
                  <PlusCircleOutlined key="edit" />,
                ]}>
                {`Grade: ${climb.difficulty} at ${climb.angle}°
                  ${climb.ascensionist_count} ascents, ${climb.quality_average}★`}
                
              </Card>
            </List.Item>
          )}
        />
      </InfiniteScroll>
    </div>
  );
};

export default ClimbsList;
