import React from 'react';
import { notFound } from 'next/navigation';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getClimb } from '@/app/lib/data/queries';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import ClimbCard from '@/app/components/climb-card/climb-card';
import BetaVideos from '@/app/components/beta-videos/beta-videos';
import { LogbookSection } from '@/app/components/logbook/logbook-section';
import ClimbViewActions from '@/app/components/climb-view/climb-view-actions';
import ClimbSocialSection from '@/app/components/social/climb-social-section';
import { dbz } from '@/app/lib/db/db';
import { eq, and } from 'drizzle-orm';
import type { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import styles from '@/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/view/[climb_uuid]/climb-view.module.css';

interface BoardSlugViewPageProps {
  params: Promise<{ board_slug: string; angle: string; climb_uuid: string }>;
}

export default async function BoardSlugViewPage(props: BoardSlugViewPageProps) {
  const params = await props.params;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const parsedParams = {
    ...boardToRouteParams(board, Number(params.angle)),
    climb_uuid: params.climb_uuid,
  };

  try {
    const fetchBetaLinks = async (): Promise<BetaLink[]> => {
      try {
        const { betaLinks } = UNIFIED_TABLES;
        const results = await dbz
          .select()
          .from(betaLinks)
          .where(
            and(eq(betaLinks.boardType, parsedParams.board_name), eq(betaLinks.climbUuid, parsedParams.climb_uuid)),
          );

        return results.map((link) => ({
          climb_uuid: link.climbUuid,
          link: link.link,
          foreign_username: link.foreignUsername,
          angle: link.angle,
          thumbnail: link.thumbnail,
          is_listed: link.isListed ?? false,
          created_at: link.createdAt ?? new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    };

    const [boardDetails, currentClimb, betaLinks] = await Promise.all([
      getBoardDetailsForBoard(parsedParams),
      getClimb(parsedParams),
      fetchBetaLinks(),
    ]);

    if (!currentClimb) {
      notFound();
    }

    const litUpHoldsMap = convertLitUpHoldsStringToMap(currentClimb.frames, parsedParams.board_name)[0];
    const climbWithProcessedData = {
      ...currentClimb,
      litUpHoldsMap,
    };

    const auroraAppUrl = constructClimbInfoUrl(
      boardDetails,
      currentClimb.uuid,
      currentClimb.angle || parsedParams.angle,
    );

    return (
      <div className={styles.pageContainer}>
        <div className={styles.actionsSection}>
          <ClimbViewActions
            climb={climbWithProcessedData}
            boardDetails={boardDetails}
            auroraAppUrl={auroraAppUrl}
            angle={parsedParams.angle}
          />
        </div>
        <div className={styles.contentWrapper}>
          <div className={styles.climbSection}>
            <ClimbCard climb={climbWithProcessedData} boardDetails={boardDetails} actions={[]} />
          </div>
          <div className={styles.sidebarSection}>
            <div className={styles.betaSection}>
              <BetaVideos betaLinks={betaLinks} />
            </div>
            <div className={styles.logbookSection}>
              <LogbookSection climb={climbWithProcessedData} />
            </div>
            <div className={styles.logbookSection}>
              <ClimbSocialSection climbUuid={parsedParams.climb_uuid} />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching climb view:', error);
    notFound();
  }
}
