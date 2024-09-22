"use client";
import React, { useEffect, useState } from "react";
import { Button, Typography, Row, Col, Drawer } from "antd";
import { Angle, GetAnglesResponse, LayoutId, BoardName } from "@/app/lib/types";
import { fetchAngles } from "../rest-api/api";

const { Title, Text } = Typography;
export type AngleButtonProps = {
  board: BoardName;
  layout: LayoutId;
  angle: Angle;
}
const AngleButton: React.FC<AngleButtonProps> = ({
  board,
  layout,
  angle,
}: AngleButtonProps) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  
  const openDrawer = () => {
    setDrawerOpen(true);
  }
  const closeDrawer = () => {
    setDrawerOpen(false);
  }

  return (
    <>
      <Button type="default" onClick={openDrawer} >{angle}°</Button>
      <Drawer title="Angles" placement="right" onClose={closeDrawer} width={"80%"} open={drawerOpen}>
        <h1>TODO: Implement</h1>
        Will show the grades etc for the current problem but at different angles
      </Drawer>
    </>
    

  )
}

export default AngleButton