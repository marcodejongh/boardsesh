import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { fetchBoardDetails, fetchCurrentClimb } from '@/app/components/rest-api/api';
import ClimbCard from '@/app/components/climb-card/climb-card';
import { Col, Row } from 'antd';
import ClimbInfoColumn from '@/app/components/climb-info/climb-info-drawer';

export default async function DynamicResultsPage({ params }: { params: BoardRouteParametersWithUuid }) {
  const parsedParams = await parseBoardRouteParams(params);

  try {
    // Fetch the search results using searchCLimbs
    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams),
    ]);

    return (
      <Row>
        <Col xs={24} md={16}>
          <ClimbCard climb={currentClimb} boardDetails={boardDetails} />
        </Col>
        <Col xs={24} md={8} style={{ marginBottom: '16px' }}>
          <ClimbInfoColumn />
        </Col>
      </Row>
    );
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound(); // or show a 500 error page
  }
}
