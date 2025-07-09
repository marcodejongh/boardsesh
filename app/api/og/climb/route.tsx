import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { fetchBoardDetails, fetchCurrentClimb } from '@/app/components/rest-api/api';
import { parseBoardRouteParams, parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap, getImageUrl } from '@/app/components/board-renderer/util';
import { HoldRenderData } from '@/app/components/board-renderer/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';

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
        layout_id: parseInt(layout_id),
        size_id: parseInt(size_id),
        set_ids: set_ids.split(',').map(id => parseInt(id.trim())),
        angle: parseInt(angle),
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
    
    // Get all board image URLs (matches BoardRenderer logic)
    const imageUrls = Object.keys(boardDetails.images_to_holds).map(imageUrl => {
      const relativeUrl = getImageUrl(imageUrl, boardDetails.board_name);
      return `${process.env.BASE_URL || 'http://localhost:3000'}${relativeUrl}`;
    });

    console.log('Board image URLs:', imageUrls);
    console.log('Board dimensions:', boardWidth, 'x', boardHeight);
    console.log('Holds data length:', holdsData.length);
    console.log('images_to_holds keys:', Object.keys(boardDetails.images_to_holds));

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
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '600px',
              height: '600px',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            {/* Board background images - render all layers */}
            {imageUrls.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Board layer ${index}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ))}
            
            {/* SVG overlay for holds */}
            <svg
              viewBox={`0 0 ${boardWidth} ${boardHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Render holds - matching BoardLitupHolds logic */}
              {holdsData.map((hold: HoldRenderData) => {
                const holdInfo = firstFrameHolds[hold.id];
                const isLitUp = holdInfo?.state && holdInfo.state !== 'OFF';
                if (!isLitUp) return null;
                
                const color = holdInfo.displayColor || holdInfo.color;
                
                // Handle mirroring like BoardLitupHolds
                let renderHold = hold;
                if (currentClimb?.mirrored && hold.mirroredHoldId) {
                  const mirroredHold = holdsData.find(h => h.id === hold.mirroredHoldId);
                  if (mirroredHold) {
                    renderHold = mirroredHold;
                  }
                }
                
                return (
                  <circle
                    key={hold.id}
                    cx={renderHold.cx}
                    cy={renderHold.cy}
                    r={renderHold.r}
                    stroke={color}
                    strokeWidth={8}
                    fillOpacity={0.7}
                    fill={color}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response(`Error generating image: ${error.message}`, { status: 500 });
  }
}

