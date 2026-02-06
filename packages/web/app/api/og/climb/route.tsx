import React from 'react';
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getClimb } from '@/app/lib/data/queries';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { convertLitUpHoldsStringToMap, getImageUrl } from '@/app/components/board-renderer/util';
import { HoldRenderData, LitupHold } from '@/app/components/board-renderer/types';
import { getGridPosition, MOONBOARD_GRID } from '@/app/lib/moonboard-config';

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

    if (!board_name || !layout_id || !size_id || !set_ids || !angle || !climb_uuid) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Use slug-aware parsing to handle both numeric and string identifiers
    const parsedParams = await parseBoardRouteParamsWithSlugs({
      board_name,
      layout_id: layout_id,
      size_id: size_id,
      set_ids: set_ids,
      angle: angle,
      climb_uuid,
    });

    const [boardDetails, currentClimb] = await Promise.all([getBoardDetailsForBoard(parsedParams), getClimb(parsedParams)]);

    // Process climb holds
    const framesData = convertLitUpHoldsStringToMap(currentClimb.frames, parsedParams.board_name);

    // Extract the first frame's data - this should be indexed by hold ID
    // If framesData is an array indexed by frame number, get the first frame
    // Otherwise, it's already indexed by hold ID
    const litUpHoldsMap = Array.isArray(framesData) || framesData[0] !== undefined ? framesData[0] : framesData;

    // Create simplified SVG board for OG image that matches BoardRenderer
    const boardWidth = boardDetails.boardWidth || 1000;
    const boardHeight = boardDetails.boardHeight || 1000;
    const holdsData = boardDetails.holdsData || [];
    const isMoonboard = parsedParams.board_name === 'moonboard';
    const baseUrl = process.env.VERCEL_URL ? 'https://www.boardsesh.com' : 'http://localhost:3000';

    // Get all board image URLs (matches BoardRenderer logic)
    let imageUrls: string[];
    if (isMoonboard && boardDetails.layoutFolder && boardDetails.holdSetImages) {
      // MoonBoard uses layout folder images instead of images_to_holds
      imageUrls = [
        `${baseUrl}/images/moonboard/moonboard-bg.png`,
        ...boardDetails.holdSetImages.map(
          (imageFile) => `${baseUrl}/images/moonboard/${boardDetails.layoutFolder}/${imageFile}`,
        ),
      ];
    } else {
      imageUrls = Object.keys(boardDetails.images_to_holds).map((imageUrl) => {
        const relativeUrl = getImageUrl(imageUrl, boardDetails.board_name);
        return `${baseUrl}${relativeUrl}`;
      });
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '40px',
            gap: '40px',
          }}
        >
          {/* Board container */}
          <div
            style={{
              position: 'relative',
              width: '600px',
              height: '600px',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}
          >
            {/* Inner container with exact board dimensions */}
            <div
              style={{
                position: 'relative',
                width: `${(600 * boardWidth) / Math.max(boardWidth, boardHeight)}px`,
                height: `${(600 * boardHeight) / Math.max(boardWidth, boardHeight)}px`,
                display: 'flex',
              }}
            >
              {/* Board background images - render all layers */}
              {imageUrls.map((imageUrl, index) => (
                // eslint-disable-next-line @next/next/no-img-element
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
                    objectFit: 'fill',
                  }}
                />
              ))}

              {/* SVG overlay for holds */}
              <svg
                viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                {isMoonboard
                  ? /* MoonBoard: grid-based hold rendering */
                    (() => {
                      const cellWidth = boardWidth / MOONBOARD_GRID.numColumns;
                      const cellHeight = boardHeight / MOONBOARD_GRID.numRows;
                      const holdRadius = Math.min(cellWidth, cellHeight) * 0.35;

                      return Object.entries(litUpHoldsMap).map(([holdIdStr, rawHoldData]) => {
                        const holdData = rawHoldData as LitupHold;
                        const holdId = Number(holdIdStr);
                        if (!holdData?.state || holdData.state === 'OFF') return null;

                        const pos = getGridPosition(holdId);
                        const cx = pos.x * boardWidth;
                        const cy = pos.y * boardHeight;

                        return (
                          <circle
                            key={holdId}
                            cx={cx}
                            cy={cy}
                            r={holdRadius}
                            stroke={holdData.displayColor || holdData.color}
                            strokeWidth={6}
                            fillOpacity={1}
                            fill={holdData.displayColor || holdData.color}
                          />
                        );
                      });
                    })()
                  : /* Aurora boards: coordinate-based hold rendering */
                    holdsData.map((hold: HoldRenderData) => {
                      const holdData = litUpHoldsMap[hold.id];
                      const isLitUp = holdData?.state && holdData.state !== 'OFF';

                      if (!isLitUp) return null;

                      const color = holdData.color;

                      // Handle mirroring like BoardLitupHolds
                      let renderHold = hold;
                      if (currentClimb?.mirrored && hold.mirroredHoldId) {
                        const mirroredHold = holdsData.find(({ id }) => id === hold.mirroredHoldId);
                        if (mirroredHold) {
                          renderHold = mirroredHold;
                        }
                      }

                      return (
                        <circle
                          key={renderHold.id}
                          id={`hold-${renderHold.id}`}
                          data-mirror-id={renderHold.mirroredHoldId || undefined}
                          cx={renderHold.cx}
                          cy={renderHold.cy}
                          r={renderHold.r}
                          stroke={color}
                          strokeWidth={6}
                          fillOpacity={0}
                          fill="transparent"
                        />
                      );
                    })}
              </svg>
            </div>
          </div>

          {/* Climb info text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '20px',
              color: '#333',
              maxWidth: '400px',
            }}
          >
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {currentClimb?.name || 'Untitled Climb'}
            </h1>
            <h2
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                alignItems: 'center',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              @{angle}°
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '24px',
                color: '#666',
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: '600' }}>Grade:</span>
                <span style={{ marginLeft: '12px' }}>{currentClimb?.difficulty || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: '600' }}>Setter:</span>
                <span style={{ marginLeft: '12px' }}>{currentClimb?.setter_username || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: '600' }}>Board:</span>
                <span style={{ marginLeft: '12px', textTransform: 'capitalize' }}>
                  {board_name} • {angle}°
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error generating image: ${message}`, { status: 500 });
  }
}
