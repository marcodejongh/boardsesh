import Card from "antd/es/card";
import { SettingOutlined, PlusCircleOutlined, FireOutlined } from "@ant-design/icons";
import ClimbCardCover from "./climb-card-cover";
import { BoulderProblem, BoardDetails, ParsedBoardRouteParameters } from "@/app/lib/types";

type ClimbCardProps = { 
  climb: BoulderProblem;
  boardDetails: BoardDetails;
  setCurrentClimb?: (climb: BoulderProblem) => void; 
  addToQueue?: (climb: BoulderProblem) => void; 
  parsedParams: ParsedBoardRouteParameters;
  clickable?: boolean;
  onCoverClick?: () => void;
}

const ClimbCard = ({
  climb,
  boardDetails,
  setCurrentClimb,
  addToQueue,
  parsedParams,
  clickable,
  onCoverClick,
}: ClimbCardProps) => {
  const cover = (
    <ClimbCardCover 
      climb={climb}
      parsedParams={parsedParams}
      boardDetails={boardDetails}
      clickable={clickable}
      onClick={onCoverClick}
      />
  );
  return (
    <Card
      title={`${climb.name} ${climb.difficulty} ★${climb.quality_average}`}
      size="small"
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