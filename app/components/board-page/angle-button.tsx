import React, { useEffect, useState } from "react";
import { Button, Typography, Row, Col, Drawer } from "antd";
import { Angle, GetAnglesResponse, Layout, Board } from "@/app/lib/types";
import { fetchAngles } from "../rest-api/api";

const { Title, Text } = Typography;
export type AngleButtonProps = {
  board: Board;
  layout: Layout;
  angle: Angle;
}
const AngleButton: React.FC<AngleButtonProps> = ({
  board,
  layout,
  angle: initialAngle
}: AngleButtonProps) => {
  const [angle, setAngle] = useState<Angle>(initialAngle)
  const [angles, setAngles] = useState<GetAnglesResponse>([]);
  const [fetchedAngles, setFetchedAngles] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  
  const openDrawer = () => {
    setDrawerOpen(true);
  }
  const closeDrawer = () => {
    setDrawerOpen(false);
  }
  
  useEffect(() => {
    const fetchAngleValues = async () => {
      try {
        // TODO: Move to a button in the resultspage
        const data = await fetchAngles(board, layout);
        setAngles(data);
        setFetchedAngles(true);
      } catch (error) {
        console.error("Error fetching angles:", error);
      }
    };

    if (!fetchedAngles) {
      fetchAngleValues();
    }
  }, [layout, board]);

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