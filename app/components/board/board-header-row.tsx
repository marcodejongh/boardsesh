"use client";

import Col from "antd/es/col"
import Row from "antd/es/row"
import Title from "antd/es/typography/Title"
import { useQueueContext } from "../board-control/queue-context";

export default () => {
  const styles = {
    titleSize: "16px",
    textSize: "12px",
    padding: "0 8px",
  };
  const { currentClimb } = useQueueContext();
  
  return (
    <Row justify="center" align="middle" style={{ width: "100%", height: "8vh", display: "flex" }}>
      <Col
        xs={24}
        sm={24}
        md={24}
        lg={24}
        xl={24}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          overflow: "hidden", // Prevent overflow for long titles
        }}
      >
        <Title
          level={4}
          style={{
            margin: 0,
            fontSize: styles.titleSize,
            lineHeight: "1.2",
            whiteSpace: "nowrap",
            overflow: "hidden", // Hide overflow for long titles
            textOverflow: "ellipsis", // Add ellipsis for long titles
            width: "100%", // Take up the full width of the flex container
            maxWidth: "100%", // Ensure it doesn't overflow outside
          }}
        >
          {currentClimb && currentClimb.name}
        </Title>
        <div
          style={{
            display: "block",
            fontSize: styles.textSize,
            whiteSpace: "nowrap",
            overflow: "hidden", // Prevent overflow for long setter names
            textOverflow: "ellipsis",
          }}
        >
          by {currentClimb && currentClimb.setter_username}
        </div>
        <div
          style={{
            display: "block",
            fontSize: styles.textSize,
            whiteSpace: "nowrap",
            overflow: "hidden", // Prevent overflow for other information
            textOverflow: "ellipsis",
          }}
        >
          {currentClimb && currentClimb.difficulty} {currentClimb && currentClimb.quality_average}★ @ {currentClimb && currentClimb.angle}°
        </div>
      </Col>
    </Row>
  );
}
