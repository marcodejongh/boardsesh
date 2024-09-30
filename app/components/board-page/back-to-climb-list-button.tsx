import React from "react";

import { ParsedBoardRouteParametersWithUuid } from "@/lib/types";
import { Button } from "antd";
import {
  LeftOutlined,
} from "@ant-design/icons";
import Link from 'next/link'
import { useQueueContext } from "../queue-control/queue-context";
import { searchParamsToUrlParams } from "@/app/lib/url-utils";

const BackToClimbList = ({
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle,
  climb_uuid
}: ParsedBoardRouteParametersWithUuid) => {
  const { climbSearchParams } = useQueueContext()
  
  return (
    <Link href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list?${searchParamsToUrlParams(climbSearchParams).toString()}#${climb_uuid}`}>
      <Button type="default" icon={(<LeftOutlined />)} />
    </Link>
  )
}
export default BackToClimbList;
