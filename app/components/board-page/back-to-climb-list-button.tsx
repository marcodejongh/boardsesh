import React from "react";

import { ParsedBoardRouteParameters } from "@/lib/types";
import { Button } from "antd";
import {
  LeftOutlined,
} from "@ant-design/icons";
import Link from 'next/link'

const BackToClimbList = ({
  board_name,
  layout_id,
  size_id,
  set_ids,
  angle,
}: ParsedBoardRouteParameters) => (
  <Link href={`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list`}>
    <Button type="default" icon={(<LeftOutlined />)} />
  </Link>
)

export default BackToClimbList;
