import React from 'react';
import { notFound } from 'next/navigation';
import { BoardRouteParametersWithUuid } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { fetchBoardDetails, fetchCurrentClimb } from '@/app/components/rest-api/api';
import ClimbCard from '@/app/components/climb-card/climb-card';
import { Col, Row, Button, Space } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import BetaVideos from '@/app/components/beta-videos/beta-videos';
import { constructClimbInfoUrl } from '@/app/lib/url-utils';
import { Metadata } from 'next';

export async function generateMetadata(props: { params: Promise<BoardRouteParametersWithUuid> }): Promise<Metadata> {
  const params = await props.params;
  const parsedParams = parseBoardRouteParams(params);
  
  try {
    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams),
    ]);
    
    const climbName = currentClimb.name || `${boardDetails.board_name} Climb`;
    const climbGrade = currentClimb.climb_type_hold?.difficulty || 'Unknown Grade';
    const setter = currentClimb.setter_username || 'Unknown Setter';
    const description = `${climbName} - ${climbGrade} by ${setter}. Quality: ${currentClimb.quality_average || 0}/5. Ascents: ${currentClimb.ascensionist_count || 0}`;
    
    return {
      title: `${climbName} - ${climbGrade} | BoardSesh`,
      description,
      openGraph: {
        title: `${climbName} - ${climbGrade}`,
        description,
        type: 'website',
        url: `/${parsedParams.board_name}/${parsedParams.layout_id}/${parsedParams.size_id}/${parsedParams.set_ids}/${parsedParams.angle}/view/${parsedParams.climb_uuid}`,
      },
      twitter: {
        card: 'summary',
        title: `${climbName} - ${climbGrade}`,
        description,
      },
    };
  } catch (error) {
    return {
      title: 'Climb View | BoardSesh',
      description: 'View climb details and beta videos',
    };
  }
}

export default async function DynamicResultsPage(props: { params: Promise<BoardRouteParametersWithUuid> }) {
  const params = await props.params;
  const parsedParams = parseBoardRouteParams(params);

  try {
    // Fetch the search results using searchCLimbs
    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams),
    ]);

    const auroraAppUrl = constructClimbInfoUrl(boardDetails, currentClimb.uuid, currentClimb.angle);

    return (
      <div style={{ padding: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Space>
              <Button 
                type="primary"
                icon={<AppstoreOutlined />}
                href={auroraAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in App
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={16}>
            <ClimbCard climb={currentClimb} boardDetails={boardDetails} />
          </Col>
          <Col xs={24} lg={8}>
            <BetaVideos boardName={parsedParams.board_name} climbUuid={parsedParams.climb_uuid} />
          </Col>
        </Row>
      </div>
    );
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound(); // or show a 500 error page
  }
}
