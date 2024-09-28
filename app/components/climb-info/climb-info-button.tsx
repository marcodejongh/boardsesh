'use client';

import React, { useState } from "react";
import { Button, Grid, Drawer } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import ClimbInfo from "./climb-info";

const { useBreakpoint } = Grid;

const ClimbInfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const screens = useBreakpoint();

  // Drawer for mobile view
  const mobileDrawer = (
    <>
      <Button type="default" icon={<InfoCircleOutlined />} onClick={() => setIsOpen(true)} />
      <Drawer
        title="Climb Info"
        placement="right"
        width={"80%"}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <ClimbInfo />
      </Drawer>
    </>
  );

  // Conditionally render based on screen size
  return screens.md ? null : mobileDrawer;
};

export default ClimbInfoButton;
