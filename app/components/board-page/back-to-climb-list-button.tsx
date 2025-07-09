import React from 'react';

import { ParsedBoardRouteParametersWithUuid, BoardDetails } from '@/lib/types';
import { Button } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQueueContext } from '../queue-control/queue-context';
import { searchParamsToUrlParams, constructClimbListWithSlugs } from '@/app/lib/url-utils';

const BackToClimbList = ({
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle,
  climb_uuid,
  boardDetails,
}: ParsedBoardRouteParametersWithUuid & { boardDetails?: BoardDetails }) => {
  const { climbSearchParams } = useQueueContext();

  const climbListUrl = boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names
    ? constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.set_names,
        angle
      )
    : `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list`;

  return (
    <Link
      href={`${climbListUrl}?${searchParamsToUrlParams(climbSearchParams).toString()}#${climb_uuid}`}
    >
      <Button type="default" icon={<LeftOutlined />} />
    </Link>
  );
};
export default BackToClimbList;
