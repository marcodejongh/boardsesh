import React, { useEffect, useState } from "react";
import { Button, Typography, Row, Col, Drawer } from "antd";
import { Layout, Board, ClimbUuid, BoulderProblem, Angle } from "@/app/lib/types";
import {
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
export type InfoButtonProps = {
  board: Board;
  layout: Layout;
  angle: Angle;
  currentClimb: BoulderProblem;
}
const AngleButton: React.FC<InfoButtonProps> = ({
  board,
  layout,
  angle: initialAngle
}: InfoButtonProps) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  
  const openDrawer = () => {
    setDrawerOpen(true);
  }
  const closeDrawer = () => {
    setDrawerOpen(false);
  }

  return (
    <>
      <Button
        type="default"
        // href="/kilter/beta/A0BC2661C68B4B00A5CDF2271CEAF246/"
        icon={<InfoCircleOutlined />}
        onClick={openDrawer}
      />
      <Drawer title="Info" placement="right" onClose={closeDrawer} width={"90%"} open={drawerOpen}>
        <h1>TODO: Implement</h1>
        This will show the first 4 beta videos, and the problem stats
      </Drawer>
    </>
    

  )
}

export default AngleButton