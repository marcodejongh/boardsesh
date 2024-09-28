import { PropsWithChildren } from "react";

import { BoardRouteParametersWithUuid, ParsedBoardRouteParameters } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import Col from "antd/es/col";
import { Content } from "antd/es/layout/layout";
import Row from "antd/es/row";

interface LayoutProps {
  params: BoardRouteParametersWithUuid;
}

export default function ListLayout ({ children, params }: PropsWithChildren<LayoutProps>)  {
  const parsedParams: ParsedBoardRouteParameters = parseBoardRouteParams(params);
  return (
    
    <Content>
      {children}
    </Content>
  )
}