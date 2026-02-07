'use client';

import React, { useCallback } from 'react';
import { Button, Empty } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails, Angle } from '@/app/lib/types';
import { useQueueContext } from '@/app/components/graphql-queue';
import SwipeBoardCarousel from '@/app/components/board-renderer/swipe-board-carousel';
import ClimbTitle from '@/app/components/climb-card/climb-title';
import { AscentStatus } from '@/app/components/queue-control/queue-list-item';
import { constructClimbListWithSlugs, constructPlayUrlWithSlugs } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './play-view.module.css';

type PlayViewClientProps = {
  boardDetails: BoardDetails;
  initialClimb: Climb | null;
  angle: Angle;
};

const PlayViewClient: React.FC<PlayViewClientProps> = ({ boardDetails, initialClimb, angle }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentClimb,
    setCurrentClimbQueueItem,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
  } = useQueueContext();

  // Use queue's current climb if available (has real-time state like mirrored),
  // otherwise fall back to the initial climb from SSR.
  const displayClimb = currentClimb || initialClimb;

  // Get the mirrored state from currentClimb when it matches the displayed climb
  const isMirrored = currentClimb?.uuid === displayClimb?.uuid
    ? !!currentClimb?.mirrored
    : !!displayClimb?.mirrored;

  const getBackToListUrl = useCallback(() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    let baseUrl: string;
    if (layout_name && size_name && set_names) {
      baseUrl = constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    } else {
      baseUrl = `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
    }

    const queryString = searchParams.toString();
    if (queryString) {
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  }, [boardDetails, angle, searchParams]);

  const navigateToClimb = useCallback(
    (climb: Climb) => {
      const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

      let url: string;
      if (layout_name && size_name && set_names) {
        url = constructPlayUrlWithSlugs(
          board_name,
          layout_name,
          size_name,
          size_description,
          set_names,
          angle,
          climb.uuid,
          climb.name,
        );
      } else {
        url = `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/play/${climb.uuid}`;
      }

      const queryString = searchParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      router.push(url);
    },
    [boardDetails, angle, router, searchParams],
  );

  const handleNext = useCallback(() => {
    const nextItem = getNextClimbQueueItem();
    if (nextItem) {
      setCurrentClimbQueueItem(nextItem);
      navigateToClimb(nextItem.climb);
      track('Play Mode Navigation', {
        direction: 'next',
        boardLayout: boardDetails.layout_name || '',
      });
    }
  }, [getNextClimbQueueItem, setCurrentClimbQueueItem, navigateToClimb, boardDetails.layout_name]);

  const handlePrevious = useCallback(() => {
    const prevItem = getPreviousClimbQueueItem();
    if (prevItem) {
      setCurrentClimbQueueItem(prevItem);
      navigateToClimb(prevItem.climb);
      track('Play Mode Navigation', {
        direction: 'previous',
        boardLayout: boardDetails.layout_name || '',
      });
    }
  }, [getPreviousClimbQueueItem, setCurrentClimbQueueItem, navigateToClimb, boardDetails.layout_name]);

  const nextItem = getNextClimbQueueItem();
  const prevItem = getPreviousClimbQueueItem();

  if (!displayClimb) {
    return (
      <div className={styles.pageContainer} style={{ backgroundColor: themeTokens.semantic.background }}>
        <div className={styles.emptyState} style={{ color: themeTokens.neutral[400] }}>
          <Empty description="No climb selected" />
          <Button type="primary" onClick={() => router.push(getBackToListUrl())}>
            Browse Climbs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer} style={{ backgroundColor: themeTokens.semantic.background }}>
      {/* Main Content with Swipe */}
      <div className={styles.contentWrapper}>
        {/* Climb title - horizontal layout with grade on right */}
        <div
          className={styles.climbTitleContainer}
          style={{
            padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[3]}px`,
          }}
        >
          <ClimbTitle
            climb={displayClimb}
            layout="horizontal"
            showSetterInfo
            titleFontSize={themeTokens.typography.fontSize['2xl']}
            rightAddon={displayClimb && <AscentStatus climbUuid={displayClimb.uuid} fontSize={themeTokens.typography.fontSize['2xl']} />}
          />
        </div>
        <SwipeBoardCarousel
          boardDetails={boardDetails}
          currentClimb={{ litUpHoldsMap: displayClimb.litUpHoldsMap, mirrored: isMirrored }}
          nextClimb={nextItem?.climb}
          previousClimb={prevItem?.climb}
          onSwipeNext={handleNext}
          onSwipePrevious={handlePrevious}
          canSwipeNext={!!nextItem}
          canSwipePrevious={!!prevItem}
          className={styles.swipeContainer}
          boardContainerClassName={styles.boardContainer}
        />
      </div>
    </div>
  );
};

export default PlayViewClient;
