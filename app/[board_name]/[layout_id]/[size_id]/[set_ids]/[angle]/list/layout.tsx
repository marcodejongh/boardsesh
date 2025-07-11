import React from 'react';

import { PropsWithChildren } from 'react';

import SearchColumn from '@/app/components/search-drawer/search-drawer';
import Col from 'antd/es/col';
import { Content } from 'antd/es/layout/layout';
import Row from 'antd/es/row';
import { BoardRouteParametersWithUuid, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { getBoardDetails } from '@/app/lib/data/queries';
import { permanentRedirect } from 'next/navigation';

interface LayoutProps {
  params: Promise<BoardRouteParametersWithUuid>;
}

export default async function ListLayout(props: PropsWithChildren<LayoutProps>) {
  const params = await props.params;

  const { children } = props;

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
        boardDetails.set_names,
        parsedParams.angle,
      );

      permanentRedirect(newUrl);
    }
  } else {
    // For new URLs, use the slug parsing function
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }


  // Fetch the climbs and board details server-side
  const boardDetails = await getBoardDetails(parsedParams);

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
