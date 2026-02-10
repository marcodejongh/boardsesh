import React from 'react';
import { notFound } from 'next/navigation';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getClimb } from '@/app/lib/data/queries';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import ClimbCard from '@/app/components/climb-card/climb-card';
import ClimbViewActions from '@/app/components/climb-view/climb-view-actions';
import ClimbViewSidebar from '@/app/components/climb-view/climb-view-sidebar';
import { dbz } from '@/app/lib/db/db';
import { eq, and } from 'drizzle-orm';
import type { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import { climbCommunityStatus } from '@/app/lib/db/schema';
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

    const fetchCommunityGrade = async (): Promise<string | null> => {
      try {
        const [result] = await dbz
          .select({ communityGrade: climbCommunityStatus.communityGrade })
          .from(climbCommunityStatus)
          .where(
            and(
              eq(climbCommunityStatus.climbUuid, parsedParams.climb_uuid),
              eq(climbCommunityStatus.boardType, parsedParams.board_name),
              eq(climbCommunityStatus.angle, parsedParams.angle),
            ),
          )
          .limit(1);
        return result?.communityGrade ?? null;
      } catch {
        return null;
      }
    };

    const [boardDetails, currentClimb, betaLinks, communityGrade] = await Promise.all([
      getBoardDetailsForBoard(parsedParams),
      getClimb(parsedParams),
      fetchBetaLinks(),
      fetchCommunityGrade(),
    ]);

    if (!currentClimb) {
      notFound();
    }

    const litUpHoldsMap = convertLitUpHoldsStringToMap(currentClimb.frames, parsedParams.board_name)[0];
    const climbWithProcessedData = {
      ...currentClimb,
      litUpHoldsMap,
      communityGrade,
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
            <ClimbViewSidebar
              climb={climbWithProcessedData}
              betaLinks={betaLinks}
              climbUuid={parsedParams.climb_uuid}
              boardType={parsedParams.board_name}
              angle={parsedParams.angle}
              currentClimbDifficulty={currentClimb.difficulty ?? undefined}
              boardName={parsedParams.board_name}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching climb view:', error);
    notFound();
  }
}
