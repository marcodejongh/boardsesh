import React from 'react';
import { PropsWithChildren } from 'react';
import { Affix, Layout } from 'antd';
import { ParsedBoardRouteParameters, BoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { parseBoardRouteParams, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { permanentRedirect } from 'next/navigation';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import { getBoardDetails } from '@/app/lib/data/queries';
import BoardSeshHeader from '@/app/components/board-page/header';
import { GraphQLQueueProvider } from '@/app/components/graphql-queue';
import { ConnectionSettingsProvider } from '@/app/components/connection-manager/connection-settings-context';
import { PartyProvider } from '@/app/components/party-manager/party-context';
import PartyProfileWrapper from '@/app/components/party-manager/party-profile-wrapper';
import { Metadata } from 'next';
import { ScrollableContent } from '@/app/components/board-page/scrollable-content';

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

    const boardDetails = await getBoardDetails(parsedParams);
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
    const boardDetails = await getBoardDetails(parsedParams);

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

  const { board_name, angle } = parsedParams;

  // Fetch the climbs and board details server-side
  const [boardDetails] = await Promise.all([getBoardDetails(parsedParams)]);

  return (
    <Layout style={{ height: '100dvh', display: 'flex', flexDirection: 'column', padding: 0 }}>
      <ConnectionSettingsProvider>
        <PartyProfileWrapper>
          <GraphQLQueueProvider parsedParams={parsedParams}>
            <PartyProvider>
            <BoardSeshHeader boardDetails={boardDetails} angle={angle} />

            <ScrollableContent>
              {children}
            </ScrollableContent>

            <Affix offsetBottom={0}>
              <QueueControlBar board={board_name} boardDetails={boardDetails} angle={angle} />
            </Affix>
            </PartyProvider>
          </GraphQLQueueProvider>
        </PartyProfileWrapper>
      </ConnectionSettingsProvider>
    </Layout>
  );
}
