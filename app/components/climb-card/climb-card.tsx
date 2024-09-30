import React from 'react';
import Card from "antd/es/card";
import { PlusCircleOutlined, FireOutlined } from "@ant-design/icons";
import ClimbCardCover from "./climb-card-cover";
import { BoulderProblem, BoardDetails, ParsedBoardRouteParameters } from "@/app/lib/types";

type ClimbCardProps = { 
  climb: BoulderProblem;
  boardDetails: BoardDetails;
  setCurrentClimb?: (climb: BoulderProblem) => void; 
  addToQueue?: (climb: BoulderProblem) => void; 
  parsedParams: ParsedBoardRouteParameters;
  clickable?: boolean;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
}

const ClimbCard = ({
  climb,
  boardDetails,
  setCurrentClimb,
  addToQueue,
  parsedParams,
  onCoverClick,
  coverLinkToClimb,
  selected,
}: ClimbCardProps) => {
  const cover = (
    <ClimbCardCover 
      climb={climb}
      parsedParams={parsedParams}
      boardDetails={boardDetails}
      onClick={onCoverClick}
      linkToClimb={coverLinkToClimb}
      />
  );
  return (
    <Card
      title={`${climb.name} ${climb.difficulty} ★${climb.quality_average}`}
      size="small"
      style={{ backgroundColor: selected ? "#eeffff" : "#FFF" }}
      actions={[
        // <SettingOutlined key="setting" />,
        <PlusCircleOutlined key="edit" onClick={addToQueue ? () => addToQueue(climb) : undefined} />,
        <FireOutlined key="set-active" onClick={setCurrentClimb ? () => setCurrentClimb(climb) : undefined} />,
      ]}
      
    >
      {/* // @ ${climb.angle}° - ${climb.ascensionist_count} ascents, */}
      {cover}
    </Card>
  )
}
export default ClimbCard;