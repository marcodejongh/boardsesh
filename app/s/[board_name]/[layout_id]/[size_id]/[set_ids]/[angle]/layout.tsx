import React from 'react';
import { PropsWithChildren } from 'react';
import { Affix, Layout } from 'antd';
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils'; // Assume this utility helps with parsing
import '@/c/index.css';

import { Content } from 'antd/es/layout/layout';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import { fetchBoardDetails } from '@/app/components/rest-api/api';
import BoardSeshHeader from '@/app/components/board-page/header';
import { QueueProvider } from '@/app/components/queue-control/queue-context';

interface BoardLayoutProps {
  params: BoardRouteParametersWithUuid;
  searchParams: {
    query?: string;
    page?: string;
    gradeAccuracy?: string;
    maxGrade?: string;
    minAscents?: string;
    minGrade?: string;
    minRating?: string;
    sortBy?: string;
    sortOrder?: string;
    name?: string;
    onlyClassics?: string;
    settername?: string;
    setternameSuggestion?: string;
    holds?: string;
    mirroredHolds?: string;
    pageSize?: string;
  };
}

export default async function BoardLayout({ children, params }: PropsWithChildren<BoardLayoutProps>) {
  // Parse the route parameters
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  const { board_name, layout_id } = parsedParams;

  // Fetch the climbs and board details server-side
  const [boardDetails] = await Promise.all([
    fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
  ]);

  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <QueueProvider parsedParams={parsedParams}>
          <BoardSeshHeader boardDetails={boardDetails} />
          <Content
            id="content-for-scrollable"
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              overflowY: 'auto',
              overflowX: 'hidden',
              height: '80vh',
              paddingLeft: '10px',
              paddingRight: '10px',
              paddingTop: '10px',
            }}
          >
            {children}
          </Content>

          <Affix offsetBottom={0}>
            <div style={{ width: '100%', backgroundColor: '#fff', boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)' }}>
              <QueueControlBar board={board_name} boardDetails={boardDetails} />
            </div>
          </Affix>
        </QueueProvider>
      </Layout>
    </>
  );
}
