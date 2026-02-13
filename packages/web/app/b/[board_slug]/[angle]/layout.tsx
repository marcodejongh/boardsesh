import React, { Suspense } from 'react';
import { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import { ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import BoardSeshHeader from '@/app/components/board-page/header';
import { GraphQLQueueProvider } from '@/app/components/graphql-queue';
import { ConnectionSettingsProvider } from '@/app/components/connection-manager/connection-settings-context';
import { PartyProvider } from '@/app/components/party-manager/party-context';
import { BoardSessionBridge } from '@/app/components/persistent-session';
import BoardPageSkeleton from '@/app/components/board-page/board-page-skeleton';
import BottomTabBar from '@/app/components/bottom-tab-bar/bottom-tab-bar';
import { BluetoothProvider } from '@/app/components/board-bluetooth-control/bluetooth-context';
import { UISearchParamsProvider } from '@/app/components/queue-control/ui-searchparams-provider';
import { BoardProvider } from '@/app/components/board-provider/board-provider-context';
import LastUsedBoardTracker from '@/app/components/board-page/last-used-board-tracker';
import { getAllBoardConfigs } from '@/app/lib/server-board-configs';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import layoutStyles from './layout.module.css';
import { themeTokens } from '@/app/theme/theme-config';

interface BoardSlugRouteParams {
  board_slug: string;
  angle: string;
}

function getBoardDetailsUniversal(parsedParams: ParsedBoardRouteParameters): BoardDetails {
  if (parsedParams.board_name === 'moonboard') {
    return getMoonBoardDetails({
      layout_id: parsedParams.layout_id,
      set_ids: parsedParams.set_ids,
    }) as BoardDetails;
  }
  return getBoardDetails(parsedParams);
}

export async function generateMetadata(props: { params: Promise<BoardSlugRouteParams> }): Promise<Metadata> {
  const params = await props.params;

  try {
    const board = await resolveBoardBySlug(params.board_slug);
    if (!board) {
      return { title: 'Board Not Found | Boardsesh' };
    }

    return {
      title: `${board.name} | Boardsesh`,
    };
  } catch {
    return { title: 'Boardsesh' };
  }
}

export default async function BoardSlugLayout(props: PropsWithChildren<{ params: Promise<BoardSlugRouteParams> }>) {
  const params = await props.params;
  const { children } = props;

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const angle = Number(params.angle);
  const parsedParams = boardToRouteParams(board, angle);

  const [boardDetails, boardConfigs] = await Promise.all([
    Promise.resolve(getBoardDetailsUniversal(parsedParams)),
    getAllBoardConfigs(),
  ]);

  const listUrl = constructBoardSlugListUrl(board.slug, angle);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: 0, background: 'var(--semantic-surface)' }}>
      <LastUsedBoardTracker
        url={listUrl}
        boardName={boardDetails.board_name}
        layoutName={boardDetails.layout_name || ''}
        sizeName={boardDetails.size_name || ''}
        sizeDescription={boardDetails.size_description}
        setNames={boardDetails.set_names || []}
        angle={angle}
      />
      <BoardProvider boardName={parsedParams.board_name}>
        <BoardSessionBridge boardDetails={boardDetails} parsedParams={parsedParams}>
          <ConnectionSettingsProvider>
            <GraphQLQueueProvider parsedParams={parsedParams} boardDetails={boardDetails}>
              <PartyProvider>
                <BluetoothProvider boardDetails={boardDetails}>
                  <UISearchParamsProvider>
                    <BoardSeshHeader boardDetails={boardDetails} angle={angle} boardConfigs={boardConfigs} isAngleAdjustable={board.isAngleAdjustable} />

                    <main
                      id="content-for-scrollable"
                      style={{
                        flex: 1,
                        paddingLeft: `${themeTokens.spacing[2]}px`,
                        paddingRight: `${themeTokens.spacing[2]}px`,
                        paddingTop: 'calc(max(8dvh, 48px) + env(safe-area-inset-top, 0px))',
                        paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
                      }}
                    >
                      <Suspense fallback={<BoardPageSkeleton aspectRatio={boardDetails.boardWidth / boardDetails.boardHeight} />}>
                        {children}
                      </Suspense>
                    </main>

                    <div className={layoutStyles.bottomBarWrapper} data-testid="bottom-bar-wrapper">
                      <QueueControlBar boardDetails={boardDetails} angle={angle} />
                      <BottomTabBar boardDetails={boardDetails} angle={angle} boardConfigs={boardConfigs} />
                    </div>
                  </UISearchParamsProvider>
                </BluetoothProvider>
              </PartyProvider>
            </GraphQLQueueProvider>
          </ConnectionSettingsProvider>
        </BoardSessionBridge>
      </BoardProvider>
    </div>
  );
}
