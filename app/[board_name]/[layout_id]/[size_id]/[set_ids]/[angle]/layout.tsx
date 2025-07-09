import React from 'react';
import { PropsWithChildren } from 'react';
import { Affix, Layout } from 'antd';
import { ParsedBoardRouteParameters, BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams, parseBoardRouteParamsWithSlugs, constructClimbListWithSlugs } from '@/app/lib/url-utils'; // Assume this utility helps with parsing
import { redirect } from 'next/navigation';
import '@/c/index.css';

import { Content } from 'antd/es/layout/layout';
import QueueControlBar from '@/app/components/queue-control/queue-control-bar';
import { fetchBoardDetails } from '@/app/components/rest-api/api';
import BoardSeshHeader from '@/app/components/board-page/header';
import { QueueProvider } from '@/app/components/queue-control/queue-context';
import { PeerProvider } from '@/app/components/connection-manager/peer-context';
import { PartyProvider } from '@/app/components/party-manager/party-context';

interface BoardLayoutProps {
  params: Promise<BoardRouteParametersWithUuid>;
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

export default async function BoardLayout(props: PropsWithChildren<BoardLayoutProps>) {
  const params = await props.params;

  const {
    children
  } = props;

  // Parse the route parameters
  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some(param => 
    param.includes(',') ? param.split(',').every(id => /^\d+$/.test(id.trim())) : /^\d+$/.test(param)
  );
  
  let parsedParams: ParsedBoardRouteParameters;
  
  if (hasNumericParams) {
    // For old URLs, use the simple parsing function first
    parsedParams = parseBoardRouteParams(params);
    
    // Redirect old URLs to new slug format
    const [boardDetails] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids)
    ]);
    
    if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
      const newUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.set_names,
        parsedParams.angle
      );
      
      redirect(newUrl);
    }
  } else {
    // For new URLs, use the slug parsing function
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  const { board_name, layout_id, angle } = parsedParams;

  // Fetch the climbs and board details server-side
  const [boardDetails] = await Promise.all([
    fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
  ]);

  return (
    <>
      <title>{`Boardsesh on ${board_name} - Layout ${layout_id}`}</title>
      <Layout style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <PeerProvider>
          <QueueProvider parsedParams={parsedParams}>
            <PartyProvider>
              <BoardSeshHeader boardDetails={boardDetails} angle={angle} />

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
                  <QueueControlBar board={board_name} boardDetails={boardDetails} angle={angle} />
                </div>
              </Affix>
            </PartyProvider>
          </QueueProvider>
        </PeerProvider>
      </Layout>
    </>
  );
}
