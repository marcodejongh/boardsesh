'use client';

import React from 'react';
import { List, Typography, Tag, Empty, Spin, Card } from 'antd';
import { CopyrightOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import Link from 'next/link';
import { BoardDetails, ParsedBoardRouteParametersWithUuid } from '@/app/lib/types';
import { fetchSimilarClimbs, SimilarClimbMatch } from '../rest-api/api';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbViewUrlWithSlugs, parseBoardRouteParams, constructClimbViewUrl } from '@/app/lib/url-utils';

const { Text, Title } = Typography;

type SimilarClimbsProps = {
  params: ParsedBoardRouteParametersWithUuid;
  boardDetails: BoardDetails;
};

const SimilarClimbItem: React.FC<{
  climb: SimilarClimbMatch;
  boardDetails: BoardDetails;
  params: ParsedBoardRouteParametersWithUuid;
}> = ({ climb, boardDetails, params }) => {
  // Build the URL for the similar climb
  const climbViewUrl =
    boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
      ? constructClimbViewUrlWithSlugs(
          boardDetails.board_name,
          boardDetails.layout_name,
          climb.matchingSizeName || boardDetails.size_name,
          boardDetails.size_description,
          boardDetails.set_names,
          climb.angle,
          climb.uuid,
          climb.name,
        )
      : (() => {
          const routeParams = parseBoardRouteParams({
            board_name: boardDetails.board_name,
            layout_id: boardDetails.layout_id.toString(),
            size_id: (climb.matchingSizeId || boardDetails.size_id).toString(),
            set_ids: boardDetails.set_ids.join(','),
            angle: climb.angle.toString(),
          });
          return constructClimbViewUrl(routeParams, climb.uuid, climb.name);
        })();

  return (
    <List.Item>
      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <div style={{ width: '80px', flexShrink: 0 }}>
          <Link href={climbViewUrl}>
            <BoardRenderer
              litUpHoldsMap={climb.litUpHoldsMap}
              mirrored={false}
              boardDetails={boardDetails}
              thumbnail
            />
          </Link>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={climbViewUrl} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Text strong style={{ display: 'block' }}>
              {climb.name}
              {climb.benchmark_difficulty && <CopyrightOutlined style={{ marginLeft: 4 }} />}
            </Text>
          </Link>
          <Text type="secondary" style={{ display: 'block' }}>
            {climb.difficulty && climb.quality_average !== '0'
              ? `${climb.difficulty} ${climb.quality_average}★`
              : 'project'}{' '}
            @ {climb.angle}°
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
            by {climb.setter_username} • {climb.ascensionist_count} ascents
          </Text>
          <div style={{ marginTop: '4px' }}>
            {climb.matchType === 'exact_larger' ? (
              <Tag color="green">Same climb on {climb.matchingSizeName}</Tag>
            ) : (
              <Tag color="blue">{Math.round(climb.similarity * 100)}% similar</Tag>
            )}
          </div>
        </div>
      </div>
    </List.Item>
  );
};

const SimilarClimbs: React.FC<SimilarClimbsProps> = ({ params, boardDetails }) => {
  const { data, error, isLoading } = useSWR(
    [`similar-climbs`, params.climb_uuid],
    () => fetchSimilarClimbs(params, 0.9, 10),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  if (isLoading) {
    return (
      <Card title="Similar Climbs" size="small">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Similar Climbs" size="small">
        <Text type="danger">Failed to load similar climbs</Text>
      </Card>
    );
  }

  const hasExactMatches = data?.exactLargerMatches && data.exactLargerMatches.length > 0;
  const hasSimilarityMatches = data?.highSimilarityMatches && data.highSimilarityMatches.length > 0;

  if (!hasExactMatches && !hasSimilarityMatches) {
    return (
      <Card title="Similar Climbs" size="small">
        <Empty description="No similar climbs found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card title="Similar Climbs" size="small">
      {hasExactMatches && (
        <>
          <Title level={5} style={{ marginTop: 0, marginBottom: '8px' }}>
            Same climb on larger boards
          </Title>
          <List
            size="small"
            dataSource={data.exactLargerMatches}
            renderItem={(climb) => (
              <SimilarClimbItem climb={climb} boardDetails={boardDetails} params={params} />
            )}
          />
        </>
      )}

      {hasSimilarityMatches && (
        <>
          <Title level={5} style={{ marginTop: hasExactMatches ? '16px' : 0, marginBottom: '8px' }}>
            Similar climbs (90%+ matching holds)
          </Title>
          <List
            size="small"
            dataSource={data.highSimilarityMatches}
            renderItem={(climb) => (
              <SimilarClimbItem climb={climb} boardDetails={boardDetails} params={params} />
            )}
          />
        </>
      )}
    </Card>
  );
};

export default SimilarClimbs;
