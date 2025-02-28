import React from 'react';

import { PropsWithChildren } from 'react';

import SearchColumn from '@/app/components/search-drawer/search-drawer';
import Col from 'antd/es/col';
import { Content } from 'antd/es/layout/layout';
import Row from 'antd/es/row';
import { BoardRouteParametersWithUuid, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { fetchBoardDetails } from '@/app/components/rest-api/api';

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default async function ListLayout(props: PropsWithChildren<LayoutProps>) {
  const params = await props.params;

  const {
    children
  } = props;

  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  const { board_name, layout_id, set_ids, size_id } = parsedParams;

  // Fetch the climbs and board details server-side
  const [boardDetails] = await Promise.all([fetchBoardDetails(board_name, layout_id, size_id, set_ids)]);

  return (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Content>{children}</Content>
      </Col>
      <Col xs={24} md={8} style={{ marginBottom: '16px' }}>
        <SearchColumn boardDetails={boardDetails} />
      </Col>
    </Row>
  );
}
