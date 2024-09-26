import React from "react";

import { ParsedBoardRouteParameters } from "@/lib/types";
import { Button } from "antd";
import {
  LeftOutlined,
} from "@ant-design/icons";
import Link from 'next/link'
import { useQueueContext } from "../board-control/queue-context";

const BackToClimbList = ({
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle,
}: ParsedBoardRouteParameters) => {
  const { climbSearchParams } = useQueueContext()
  
  return (
    <Link href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list?${new URLSearchParams(climbSearchParams).toString()}`}>
      <Button type="default" icon={(<LeftOutlined />)} />
    </Link>
  )
}
export default BackToClimbList;
