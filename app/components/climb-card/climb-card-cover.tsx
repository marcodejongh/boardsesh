import { BoulderProblem, GetBoardDetailsResponse, ParsedBoardRouteParameters } from "@/app/lib/types";
import { constructClimbViewUrl } from "@/app/lib/url-utils";
import BoardRenderer from "@/app/components/board/board-renderer";
import BoardLitupHolds from "@/app/components/board/board-litup-holds";
import Link from "next/link";

type ClimbCardCoverProps = { 
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParameters;
  setCurrentClimb?: (climb: BoulderProblem) => void;
  boardDetails: GetBoardDetailsResponse;
  children: React.ReactNode
}

const ClimbCardCover = ({
  climb,
  parsedParams,
  setCurrentClimb,
  boardDetails,
  children,
}: ClimbCardCoverProps) => (
  <Link onClick={setCurrentClimb ? () => { setCurrentClimb(climb) } : undefined} href={constructClimbViewUrl(parsedParams, climb.uuid)}>
    <BoardRenderer boardDetails={boardDetails} board_name={parsedParams.board_name}>
      {children}
    </BoardRenderer>
  </Link>
);

export default ClimbCardCover;