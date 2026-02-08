import React, { Suspense } from 'react';
import { PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import { ParsedBoardRouteParameters, BoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { parseBoardRouteParams, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { permanentRedirect } from 'next/navigation';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import BoardSeshHeader from '@/app/components/board-page/header';
import { GraphQLQueueProvider } from '@/app/components/graphql-queue';
import { ConnectionSettingsProvider } from '@/app/components/connection-manager/connection-settings-context';
import { PartyProvider } from '@/app/components/party-manager/party-context';
import { BoardSessionBridge } from '@/app/components/persistent-session';
import { Metadata } from 'next';
import BoardPageSkeleton from '@/app/components/board-page/board-page-skeleton';
import BottomTabBar from '@/app/components/bottom-tab-bar/bottom-tab-bar';
import { BluetoothProvider } from '@/app/components/board-bluetooth-control/bluetooth-context';
import { UISearchParamsProvider } from '@/app/components/queue-control/ui-searchparams-provider';

// Helper to get board details for any board type
function getBoardDetailsUniversal(parsedParams: ParsedBoardRouteParameters): BoardDetails {
  if (parsedParams.board_name === 'moonboard') {
    return getMoonBoardDetails({
      layout_id: parsedParams.layout_id,
      set_ids: parsedParams.set_ids,
    }) as BoardDetails;
  }
  return getBoardDetails(parsedParams);
}

/**
 * Generates a user-friendly page title from board details.
 * Example output: "Kilter Original 12x12 | Boardsesh"
 */
function generateBoardTitle(boardDetails: BoardDetails): string {
  const parts: string[] = [];

  // Capitalize board name
  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  parts.push(boardName);

  // Add layout name if available, but strip out board name prefix to avoid duplication
  if (boardDetails.layout_name) {
    // Remove board name prefix (e.g., "Kilter Board Original" -> "Original")
    const layoutName = boardDetails.layout_name
      .replace(new RegExp(`^${boardDetails.board_name}\\s*(board)?\\s*`, 'i'), '')
      .trim();

    if (layoutName) {
      parts.push(layoutName);
    }
  }

  // Add size info - prefer size_name, fallback to size_description
  if (boardDetails.size_name) {
    // Extract dimensions if present (e.g., "12 x 12 Commercial" -> "12x12")
    const sizeMatch = boardDetails.size_name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      parts.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
    } else {
      parts.push(boardDetails.size_name);
    }
  } else if (boardDetails.size_description) {
    parts.push(boardDetails.size_description);
  }

  return `${parts.join(' ')} | Boardsesh`;
}

export async function generateMetadata(props: { params: Promise<BoardRouteParameters> }): Promise<Metadata> {
  const params = await props.params;

  try {
    const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
      param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
    );

    let parsedParams: ParsedBoardRouteParameters;

    if (hasNumericParams) {
      parsedParams = parseBoardRouteParams(params);
    } else {
      parsedParams = await parseBoardRouteParamsWithSlugs(params);
    }

    const boardDetails = getBoardDetailsUniversal(parsedParams);
    const title = generateBoardTitle(boardDetails);

    return {
      title,
    };
  } catch {
    // Fallback title if metadata generation fails
    const boardName = params.board_name.charAt(0).toUpperCase() + params.board_name.slice(1);
    return {
      title: `${boardName} | Boardsesh`,
    };
  }
}

interface BoardLayoutProps {
  params: Promise<BoardRouteParameters>;
}

export default async function BoardLayout(props: PropsWithChildren<BoardLayoutProps>) {
  const params = await props.params;

  const { children } = props;

  // Parse the route parameters
  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams: ParsedBoardRouteParameters;

  if (hasNumericParams) {
    // For old URLs, use the simple parsing function first
    parsedParams = parseBoardRouteParams(params);

    // Redirect old URLs to new slug format
    const boardDetails = getBoardDetailsUniversal(parsedParams);

    if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
      const newUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.size_description,
        boardDetails.set_names,
        parsedParams.angle,
      );

      permanentRedirect(newUrl);
    }
  } else {
    // For new URLs, use the slug parsing function
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  const { angle } = parsedParams;

  // Fetch the board details server-side
  const boardDetails = getBoardDetailsUniversal(parsedParams);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: 0, background: 'var(--semantic-surface)' }}>
      <BoardSessionBridge boardDetails={boardDetails} parsedParams={parsedParams}>
        <ConnectionSettingsProvider>
          <GraphQLQueueProvider parsedParams={parsedParams} boardDetails={boardDetails}>
            <PartyProvider>
              <BluetoothProvider boardDetails={boardDetails}>
                <UISearchParamsProvider>
                  <BoardSeshHeader boardDetails={boardDetails} angle={angle} />

                  <Box
                    component="main"
                    id="content-for-scrollable"
                    sx={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflowX: 'hidden',
                      paddingLeft: '10px',
                      paddingRight: '10px',
                      paddingTop: 'calc(max(8dvh, 48px) + env(safe-area-inset-top, 0px))',
                      paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
                    }}
                  >
                    <Suspense fallback={<BoardPageSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} />}>
                      {children}
                    </Suspense>
                  </Box>

                  <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}>
                    <QueueControlBar boardDetails={boardDetails} angle={angle} />
                    <BottomTabBar boardDetails={boardDetails} angle={angle} />
                  </div>
                </UISearchParamsProvider>
              </BluetoothProvider>
            </PartyProvider>
          </GraphQLQueueProvider>
        </ConnectionSettingsProvider>
      </BoardSessionBridge>
    </Box>
  );
}
