/**
 * Instagram Polling Service
 *
 * This service polls Instagram's Graph API for mentions of @boardsesh
 * and automatically creates beta video entries for moderation.
 *
 * Setup Requirements:
 * 1. Create an Instagram Business account (@boardsesh)
 * 2. Create a Facebook App and get credentials
 * 3. Add Instagram Basic Display or Instagram Graph API to your app
 * 4. Get a long-lived access token
 * 5. Set environment variables:
 *    - INSTAGRAM_BUSINESS_ACCOUNT_ID
 *    - INSTAGRAM_ACCESS_TOKEN
 */

import { dbz } from '@/app/lib/db/db';
import { kilterBetaLinks, tensionBetaLinks } from '@/app/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
}

interface ClimbInfo {
  board_name: 'kilter' | 'tension';
  climb_uuid?: string;
  angle?: number;
  grade?: string;
}

/**
 * Parse caption to extract climb information
 *
 * Expected formats:
 * - "Just sent V6 at 40° on the Kilter Board! @boardsesh"
 * - "Kilter V8 30° @boardsesh"
 * - Link to climb: "boardsesh.com/kilter/.../climb/uuid @boardsesh"
 */
function parseClimbInfo(caption: string): ClimbInfo | null {
  const lowerCaption = caption.toLowerCase();

  // Extract board name
  let board_name: 'kilter' | 'tension' | null = null;
  if (lowerCaption.includes('kilter')) {
    board_name = 'kilter';
  } else if (lowerCaption.includes('tension')) {
    board_name = 'tension';
  }

  if (!board_name) {
    return null; // Can't determine board
  }

  // Try to extract climb UUID from BoardSesh URL
  const urlMatch = caption.match(/boardsesh\.com\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+\/view\/([a-f0-9-]+)/i);
  const climb_uuid = urlMatch ? urlMatch[1] : undefined;

  // Extract angle (e.g., "40°" or "40 degrees")
  const angleMatch = caption.match(/(\d+)\s*(?:°|degrees?)/i);
  const angle = angleMatch ? parseInt(angleMatch[1]) : undefined;

  // Extract grade (e.g., "V6", "V8")
  const gradeMatch = caption.match(/V\d+/i);
  const grade = gradeMatch ? gradeMatch[0] : undefined;

  return {
    board_name,
    climb_uuid,
    angle,
    grade,
  };
}

/**
 * Fetch mentioned media from Instagram Graph API
 */
async function fetchMentionedMedia(): Promise<InstagramMedia[]> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    console.error('Instagram credentials not configured');
    return [];
  }

  try {
    // Get media where the account is mentioned
    const url = new URL(`https://graph.facebook.com/v22.0/${accountId}`);
    url.searchParams.set('fields', 'mentioned_media.limit(50){caption,media_type,media_url,permalink,thumbnail_url,timestamp,username}');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error('Instagram API error:', error);
      return [];
    }

    const data = await response.json();
    return data.mentioned_media?.data || [];
  } catch (error) {
    console.error('Error fetching Instagram mentions:', error);
    return [];
  }
}

/**
 * Check if a beta link already exists
 */
async function betaLinkExists(boardName: 'kilter' | 'tension', link: string): Promise<boolean> {
  const table = boardName === 'kilter' ? kilterBetaLinks : tensionBetaLinks;

  const existing = await dbz
    .select()
    .from(table)
    .where(eq(table.link, link))
    .limit(1);

  return existing.length > 0;
}

/**
 * Create a beta link entry
 */
async function createBetaLink(
  boardName: 'kilter' | 'tension',
  climbUuid: string,
  link: string,
  username: string,
  angle?: number,
  thumbnail?: string,
) {
  const table = boardName === 'kilter' ? kilterBetaLinks : tensionBetaLinks;

  await dbz.insert(table).values({
    climbUuid,
    link,
    foreignUsername: username,
    angle: angle || null,
    thumbnail: thumbnail || null,
    isListed: false, // Require moderation
    createdAt: new Date().toISOString(),
  });

  console.log(`Created beta link for ${boardName} climb ${climbUuid} from @${username}`);
}

/**
 * Main polling function
 *
 * Call this periodically (e.g., via cron job) to check for new mentions
 */
export async function pollInstagramMentions(): Promise<{
  processed: number;
  created: number;
  skipped: number;
  errors: number;
}> {
  console.log('Polling Instagram for @boardsesh mentions...');

  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const mentionedMedia = await fetchMentionedMedia();

    for (const media of mentionedMedia) {
      stats.processed++;

      // Skip if not a video or carousel (which might contain video)
      if (media.media_type !== 'VIDEO' && media.media_type !== 'CAROUSEL_ALBUM') {
        stats.skipped++;
        continue;
      }

      // Parse climb info from caption
      if (!media.caption) {
        stats.skipped++;
        continue;
      }

      const climbInfo = parseClimbInfo(media.caption);

      if (!climbInfo || !climbInfo.climb_uuid) {
        // Can't determine which climb this is for
        // Could potentially store these for manual review
        stats.skipped++;
        continue;
      }

      // Check if this link already exists
      if (await betaLinkExists(climbInfo.board_name, media.permalink)) {
        stats.skipped++;
        continue;
      }

      try {
        // Create the beta link
        await createBetaLink(
          climbInfo.board_name,
          climbInfo.climb_uuid,
          media.permalink,
          media.username,
          climbInfo.angle,
          media.thumbnail_url,
        );

        stats.created++;
      } catch (error) {
        console.error(`Error creating beta link for ${media.permalink}:`, error);
        stats.errors++;
      }
    }

    console.log('Instagram polling complete:', stats);
    return stats;
  } catch (error) {
    console.error('Error during Instagram polling:', error);
    throw error;
  }
}
