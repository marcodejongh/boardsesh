import Card from "antd/es/card";
import { SettingOutlined, PlusCircleOutlined } from "@ant-design/icons";
import ClimbCardCover from "./climb-card-cover";
import { BoulderProblem, GetBoardDetailsResponse, ParsedBoardRouteParameters } from "@/app/lib/types";

type ClimbCardProps = { 
  climb: BoulderProblem;
  boardDetails: GetBoardDetailsResponse;
  setCurrentClimb?: (climb: BoulderProblem) => void; 
  parsedParams: ParsedBoardRouteParameters;
  children: React.ReactNode;
  clickable?: boolean;
}

const ClimbCard = ({
  climb,
  boardDetails,
  setCurrentClimb,
  parsedParams,
  children,
  clickable,
}: ClimbCardProps) => {
  const cover = (
    <ClimbCardCover 
      climb={climb}
      parsedParams={parsedParams}
      setCurrentClimb={setCurrentClimb}
      boardDetails={boardDetails}
      clickable={clickable}>
      {children}
    </ClimbCardCover>
  );
  return (
    <Card
      size="small"
      title={`${climb.name} ${climb.difficulty}`}
      cover={cover}
      actions={[
        <SettingOutlined key="setting" />,
        <PlusCircleOutlined key="edit" />,
      ]}
    >
      {`Grade: ${climb.difficulty} at ${climb.angle}° - ${climb.ascensionist_count} ascents, ${climb.quality_average}★`}
    </Card>
  )
}
export default ClimbCard;