import Card from "antd/es/card";
import { SettingOutlined, PlusCircleOutlined, FireOutlined } from "@ant-design/icons";
import ClimbCardCover from "./climb-card-cover";
import { BoulderProblem, GetBoardDetailsResponse, ParsedBoardRouteParameters } from "@/app/lib/types";

type ClimbCardProps = { 
  climb: BoulderProblem;
  boardDetails: GetBoardDetailsResponse;
  setCurrentClimb?: (climb: BoulderProblem) => void; 
  addToQueue?: (climb: BoulderProblem) => void; 
  parsedParams: ParsedBoardRouteParameters;
  children: React.ReactNode;
  clickable?: boolean;
}

const ClimbCard = ({
  climb,
  boardDetails,
  setCurrentClimb,
  addToQueue,
  parsedParams,
  children,
  clickable,
}: ClimbCardProps) => {
  const cover = (
    <ClimbCardCover 
      climb={climb}
      parsedParams={parsedParams}
      boardDetails={boardDetails}
      clickable={clickable}>
      {children}
    </ClimbCardCover>
  );
  return (
    <Card
      title={`${climb.name} ${climb.difficulty} ★${climb.quality_average}`}
      cover={cover}
      actions={[
        // <SettingOutlined key="setting" />,
        <PlusCircleOutlined key="edit" onClick={addToQueue ? () => addToQueue(climb) : undefined} />,
        <FireOutlined key="edit" onClick={setCurrentClimb ? () => setCurrentClimb(climb) : undefined} />,
      ]}
      // @ ${climb.angle}° - ${climb.ascensionist_count} ascents,
    >
    </Card>
  )
}
export default ClimbCard;