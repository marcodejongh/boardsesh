import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { BoardRouteParametersWithUuid, BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { getClimb } from '@/app/lib/data/queries';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import ClimbCard from '@/app/components/climb-card/climb-card';

// Helper to get board details for any board type
function getBoardDetailsForBoard(params: ParsedBoardRouteParameters): BoardDetails {
  if (params.board_name === 'moonboard') {
    return getMoonBoardDetails({
      layout_id: params.layout_id,
      set_ids: params.set_ids,
    });
  }
  return getBoardDetails(params);
}
import BetaVideos from '@/app/components/beta-videos/beta-videos';
import { LogbookSection } from '@/app/components/logbook/logbook-section';
import {
  constructClimbInfoUrl,
  extractUuidFromSlug,
  constructClimbViewUrl,
  isUuidOnly,
  constructClimbViewUrlWithSlugs,
  parseBoardRouteParams,
} from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import ClimbViewActions from '@/app/components/climb-view/climb-view-actions';
import { Metadata } from 'next';
import { dbz } from '@/app/lib/db/db';
import { eq, and } from 'drizzle-orm';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import styles from './climb-view.module.css';

export async function generateMetadata(props: { params: Promise<BoardRouteParametersWithUuid> }): Promise<Metadata> {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const [boardDetails, currentClimb] = await Promise.all([getBoardDetailsForBoard(parsedParams), getClimb(parsedParams)]);

    const climbName = currentClimb.name || `${boardDetails.board_name} Climb`;
    const climbGrade = currentClimb.difficulty || 'Unknown Grade';
    const setter = currentClimb.setter_username || 'Unknown Setter';
    const description = `${climbName} - ${climbGrade} by ${setter}. Quality: ${currentClimb.quality_average || 0}/5. Ascents: ${currentClimb.ascensionist_count || 0}`;
    const climbUrl = constructClimbViewUrl(parsedParams, parsedParams.climb_uuid, climbName);

    // Generate OG image URL - use parsed numeric IDs for better performance
    const ogImageUrl = new URL('/api/og/climb', 'https://boardsesh.com');
    ogImageUrl.searchParams.set('board_name', parsedParams.board_name);
    ogImageUrl.searchParams.set('layout_id', parsedParams.layout_id.toString());
    ogImageUrl.searchParams.set('size_id', parsedParams.size_id.toString());
    ogImageUrl.searchParams.set('set_ids', parsedParams.set_ids.join(','));
    ogImageUrl.searchParams.set('angle', parsedParams.angle.toString());
    ogImageUrl.searchParams.set('climb_uuid', parsedParams.climb_uuid);

    return {
      title: `${climbName} - ${climbGrade} | Boardsesh`,
      description,
      openGraph: {
        title: `${climbName} - ${climbGrade}`,
        description,
        type: 'website',
        url: climbUrl,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: `${climbName} - ${climbGrade} on ${boardDetails.board_name} board`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${climbName} - ${climbGrade}`,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    return {
      title: 'Climb View | Boardsesh',
      description: 'View climb details and beta videos',
    };
  }
}

export default async function DynamicResultsPage(props: { params: Promise<BoardRouteParametersWithUuid> }) {
  const params = await props.params;

  try {
    // Check if any parameters are in numeric format (old URLs)
    const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
      param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
    );

    let parsedParams;

    if (hasNumericParams) {
      // For old URLs, use the simple parsing function first
      parsedParams = parseBoardRouteParams({
        ...params,
        climb_uuid: extractUuidFromSlug(params.climb_uuid),
      });
    } else {
      // For new URLs, use the slug parsing function
      parsedParams = await parseBoardRouteParamsWithSlugs(params);
    }

    if (hasNumericParams || isUuidOnly(params.climb_uuid)) {
      // Need to redirect to new slug-based URL
      const currentClimb = await getClimb(parsedParams);

      // Get the names for slug generation
      const layouts = await import('@/app/lib/data/queries').then((m) => m.getLayouts(parsedParams.board_name));
      const sizes = await import('@/app/lib/data/queries').then((m) =>
        m.getSizes(parsedParams.board_name, parsedParams.layout_id),
      );
      const sets = await import('@/app/lib/data/queries').then((m) =>
        m.getSets(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id),
      );

      const layout = layouts.find((l) => l.id === parsedParams.layout_id);
      const size = sizes.find((s) => s.id === parsedParams.size_id);
      const selectedSets = sets.filter((s) => parsedParams.set_ids.includes(s.id));

      if (layout && size && selectedSets.length > 0) {
        const newUrl = constructClimbViewUrlWithSlugs(
          parsedParams.board_name,
          layout.name,
          size.name,
          size.description,
          selectedSets.map((s) => s.name),
          parsedParams.angle,
          parsedParams.climb_uuid,
          currentClimb.name,
        );
        permanentRedirect(newUrl);
      }
    }
    // Fetch beta links server-side
    const fetchBetaLinks = async (): Promise<BetaLink[]> => {
      try {
        const { betaLinks } = UNIFIED_TABLES;

        const results = await dbz
          .select()
          .from(betaLinks)
          .where(
            and(eq(betaLinks.boardType, parsedParams.board_name), eq(betaLinks.climbUuid, parsedParams.climb_uuid)),
          );

        // Transform the database results to match the BetaLink interface
        return results.map((link) => ({
          climb_uuid: link.climbUuid,
          link: link.link,
          foreign_username: link.foreignUsername,
          angle: link.angle,
          thumbnail: link.thumbnail,
          is_listed: link.isListed ?? false,
          created_at: link.createdAt ?? new Date().toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching beta links:', error);
        return [];
      }
    };

    // Fetch the search results using searchCLimbs
    const [boardDetails, currentClimb, betaLinks] = await Promise.all([
      getBoardDetailsForBoard(parsedParams),
      getClimb(parsedParams),
      fetchBetaLinks(),
    ]);

    if (!currentClimb) {
      console.error('Climb not found for params:', parsedParams);
      notFound();
    }

    // Process the frames to get litUpHoldsMap (same as the API does)
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
        {/* Actions Section */}
        <div className={styles.actionsSection}>
          <ClimbViewActions
            climb={climbWithProcessedData}
            boardDetails={boardDetails}
            auroraAppUrl={auroraAppUrl}
            angle={parsedParams.angle}
          />
        </div>

        {/* Main Content */}
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
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound(); // or show a 500 error page
  }
}
