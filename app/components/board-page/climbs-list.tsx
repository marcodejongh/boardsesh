'use client';
import React from 'react';

import { Row, Col, Skeleton } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useQueueContext } from '../queue-control/queue-context';
import ClimbCard from '../climb-card/climb-card';
import { useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { PlusCircleOutlined, FireOutlined } from '@ant-design/icons';

type ClimbsListProps = ParsedBoardRouteParameters & {
  boardDetails: BoardDetails;
  initialClimbs: Climb[];
};

const ClimbCardSkeletons = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  return (
    <Col xs={24} lg={12} xl={12}>
      <ClimbCard boardDetails={boardDetails} actions={[<PlusCircleOutlined />, <FireOutlined />]} />
    </Col>
  );
};

const ClimbsListSkeleton = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  return Array.from({ length: 10 }, (_, i) => i + 1).map(() => <ClimbCardSkeletons boardDetails={boardDetails} />);
};

const ClimbsList = ({ boardDetails, initialClimbs }: ClimbsListProps) => {
  const {
    setCurrentClimb,
    climbSearchResults,
    hasMoreResults,
    fetchMoreClimbs,
    currentClimb,
    hasDoneFirstFetch,
    isFetchingClimbs,
  } = useQueueContext();

  // Queue Context provider uses SWR infinite to fetch results, which can only happen clientside.
  // That data equals null at the start, so when its null we use the initialClimbs array which we
  // fill on the server side in the page component. This way the user never sees a loading state for
  // the climb list.
  const climbs = !hasDoneFirstFetch ? initialClimbs : climbSearchResults || [];

  // A ref to store each climb's DOM element position for easier scroll tracking
  const climbsRefs = useRef<{ [uuid: string]: HTMLDivElement | null }>({});

  const updateHash = (climbId: string) => {
    history.replaceState(null, '', `#${climbId}`);
  };

  /**
   * TODO: Figure out a better way to restore scroll position, might want to try out react-query
   * which promises that it always restores scroll correctly. But for now this works, and as a
   * cool side-effect shared links will also scroll to the correct item.
   */
  const handleScroll = () => {
    let closestClimb = null;
    let closestDistance = Infinity;

    const climbUuids = Object.keys(climbsRefs.current);

    for (let i = 0; i < climbUuids.length; i++) {
      const uuid = climbUuids[i];
      const climbElement = climbsRefs.current[uuid];

      if (climbElement) {
        const rect = climbElement.getBoundingClientRect();
        const distanceFromViewportTop = Math.abs(rect.top - 100); // Adjust 100 to your viewport reference

        if (distanceFromViewportTop < closestDistance) {
          closestDistance = distanceFromViewportTop;
          closestClimb = uuid;
        } else {
          // If distance starts to increase, no need to check further climbs
          break;
        }
      }
    }

    // If the closest climb is different from the current one, update the hash
    if (closestClimb) {
      updateHash(closestClimb);
    }
  };

  const debouncedHandleScroll = useDebouncedCallback(handleScroll, 500);

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
      endMessage={<div style={{ textAlign: 'center' }}>No more climbs 🤐</div>}
      // Probably not how this should be done in a React app, but it works and I ain't no CSS-wizard
      scrollableTarget="content-for-scrollable"
      onScroll={debouncedHandleScroll}
    >
      <Row gutter={[16, 16]}>
        {climbs.map((climb) => (
          <Col xs={24} lg={12} xl={12} key={climb.uuid}>
            <div
              ref={(el) => {
                climbsRefs.current[climb.uuid] = el;
              }}
            >
              <ClimbCard
                climb={climb}
                boardDetails={boardDetails}
                selected={currentClimb?.uuid === climb.uuid}
                onCoverClick={() => setCurrentClimb(climb)}
              />
            </div>
          </Col>
        ))}
        {isFetchingClimbs && (!climbs || climbs.length === 0) ? (
          <ClimbsListSkeleton boardDetails={boardDetails} />
        ) : null}
      </Row>
    </InfiniteScroll>
  );
};

export default ClimbsList;
