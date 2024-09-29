'use client';

import { Row, Col, Typography, Skeleton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import { BoulderProblem, ParsedBoardRouteParameters, BoardDetails, ParsedBoardRouteParametersWithUuid, ClimbUuid, BoardRouteParameters } from "@/app/lib/types";
import { useQueueContext } from "../board-control/queue-context";
import ClimbCard from "../climb-card/climb-card";
import { parseBoardRouteParams, urlParamsToSearchParams } from "@/app/lib/url-utils";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import BoardRenderer from "../board-renderer/board-renderer";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

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
  
  // A ref to store each climb's DOM element position for easier scroll tracking
  const climbsRefs = useRef<{ [uuid: string]: HTMLDivElement | null }>({});

  const updateHash = (climbId: string) => {
    history.replaceState(null, '', `#${climbId}`);
  };

    // onScroll handler to track which climb is most visible
  const handleScroll = () => {
    let closestClimb = null;
    let closestDistance = Infinity;

    Object.keys(climbsRefs.current).forEach((uuid) => {
      const climbElement = climbsRefs.current[uuid];
      if (climbElement) {
        const rect = climbElement.getBoundingClientRect();
        const distanceFromViewportTop = Math.abs(rect.top - 100); // You can adjust 100 to be where you want it to be considered "in view"
        if (distanceFromViewportTop < closestDistance) {
          closestDistance = distanceFromViewportTop;
          closestClimb = uuid;
        }
      }
    });

    // If the closest climb is different from the current one, update the hash
    if (closestClimb) {
      updateHash(closestClimb);
    }
  };
  const debouncedHandleScroll = useDebouncedCallback(handleScroll, 300);

    // Function to restore scroll based on the hash in the URL
  const restoreScrollFromHash = () => {
    const hash = window.location.hash;
    if (hash) {
      const climbId = hash.substring(1);
      const climbElement = climbsRefs.current[climbId];

      if (climbElement) {
        climbElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  };

  // When the component mounts, restore the scroll position based on the hash
  useEffect(() => {
    restoreScrollFromHash();
  }, []); 
  
  return (
      <InfiniteScroll
        dataLength={climbs.length}
        next={fetchMoreClimbs}
        hasMore={hasMoreResults}
        loader={<Skeleton active />}
        endMessage={<div style={{ textAlign: "center" }}>No more climbs 🤐</div>}
        // Probably not how this should be done in a React app, but it works and I ain't no CSS-wizard
        scrollableTarget="content-for-scrollable"
        onScroll={debouncedHandleScroll}
      >
        <Row gutter={[16, 16]}>
          {climbs.map((climb) => (
            <Col xs={24} lg={12} xl={12} key={climb.uuid}>
              <div ref={(el) => { climbsRefs.current[climb.uuid] = el; }}>
                <ClimbCard 
                  setCurrentClimb={setCurrentClimb}
                  addToQueue={addToQueue}
                  parsedParams={parsedParams}
                  climb={climb}
                  boardDetails={boardDetails} 
                  clickable
                />
              </div>
              
            </Col>
            )
          )}
        </Row>
      </InfiniteScroll>
  );
};

export default ClimbsList;
