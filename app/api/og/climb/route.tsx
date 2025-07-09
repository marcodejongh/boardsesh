import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { fetchBoardDetails, fetchCurrentClimb } from '@/app/components/rest-api/api';
import { parseBoardRouteParams, parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap, getImageUrl } from '@/app/components/board-renderer/util';
import { HoldRenderData } from '@/app/components/board-renderer/types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters from query string
    const board_name = searchParams.get('board_name');
    const layout_id = searchParams.get('layout_id');
    const size_id = searchParams.get('size_id');
    const set_ids = searchParams.get('set_ids');
    const angle = searchParams.get('angle');
    const climb_uuid = searchParams.get('climb_uuid');

    console.log('OG Image params:', { board_name, layout_id, size_id, set_ids, angle, climb_uuid });

    if (!board_name || !layout_id || !size_id || !set_ids || !angle || !climb_uuid) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Check if parameters are numeric (old format) or slug-based (new format)
    const isNumericFormat = !isNaN(parseInt(layout_id)) && !isNaN(parseInt(size_id));
    
    let parsedParams;
    if (isNumericFormat) {
      // Use numeric parsing for old format
      parsedParams = parseBoardRouteParams({
        board_name,
        layout_id: layout_id,
        size_id: size_id,
        set_ids: set_ids,
        angle: angle,
        climb_uuid,
      });
    } else {
      // Use slug parsing for new format
      parsedParams = await parseBoardRouteParamsWithSlugs({
        board_name,
        layout_id,
        size_id,
        set_ids,
        angle,
        climb_uuid,
      });
    }

    console.log('Parsed params:', parsedParams);

    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams),
    ]);

    console.log('Board details:', !!boardDetails, 'Current climb:', !!currentClimb);
    console.log('Climb frames:', currentClimb?.frames);

    // Process climb holds
    const litUpHoldsMap = convertLitUpHoldsStringToMap(currentClimb.frames, parsedParams.board_name as any);

    console.log('Lit up holds map:', litUpHoldsMap);

    // Create simplified SVG board for OG image that matches BoardRenderer
    const boardWidth = boardDetails.boardWidth || 1000;
    const boardHeight = boardDetails.boardHeight || 1000;
    const holdsData = boardDetails.holdsData || [];
    const firstFrameHolds = litUpHoldsMap[0] || {};
    
    // Get the first board image URL (matches BoardRenderer logic)
    const firstImageUrl = Object.keys(boardDetails.images_to_holds)[0];
    const relativeImageUrl = firstImageUrl ? getImageUrl(firstImageUrl, boardDetails.board_name) : null;
    const boardImageUrl = relativeImageUrl ? `${process.env.BASE_URL || 'http://localhost:3000'}${relativeImageUrl}` : null;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            padding: '20px',
          }}
        >
          <svg
            viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            width="600"
            height="600"
            style={{
              background: '#333',
              borderRadius: '8px',
            }}
          >
            {/* Board background - just a solid color for now */}
            <rect
              x="0"
              y="0"
              width={boardWidth}
              height={boardHeight}
              fill="#2a2a2a"
            />
            
            {/* Render holds */}
            {holdsData.map((hold: HoldRenderData) => {
              const holdInfo = firstFrameHolds[hold.id];
              if (!holdInfo) return null;
              
              const holdColor = holdInfo.displayColor || holdInfo.color;
              const cx = currentClimb?.mirrored ? boardWidth - hold.cx : hold.cx;
              
              return (
                <circle
                  key={hold.id}
                  cx={cx}
                  cy={hold.cy}
                  r={Math.max(hold.r, 8)} // Ensure holds are visible
                  fill={holdColor}
                  stroke="#fff"
                  strokeWidth="3"
                />
              );
            })}
          </svg>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error generating image: ${message}`, { status: 500 });
  }
}
