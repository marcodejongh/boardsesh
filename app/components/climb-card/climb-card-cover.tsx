import { BoulderProblem, ClimbUuid, BoardDetails, ParsedBoardRouteParameters } from "@/app/lib/types";
import { constructClimbViewUrl } from "@/app/lib/url-utils";
import BoardRenderer from "@/app/components/board-renderer/board-renderer";
import Link from "next/link";
type ClimbCardCoverProps = { 
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParameters;
  boardDetails: BoardDetails;
  clickable?: boolean;
  onClick?: () => void;
}

const ClimbCardCover = ({
  climb,
  parsedParams,
  boardDetails,
  clickable,
  onClick,
}: ClimbCardCoverProps) => {
  const boardRenderer = (
    <div style={{ width: "100%", height: "auto", position: "relative" }}>
      <BoardRenderer 
        boardDetails={boardDetails}
        board_name={parsedParams.board_name} 
        holdsData={boardDetails.holdsData}
        litUpHoldsMap={climb.litUpHoldsMap}
        />
    </div>
  );
  if (!clickable || !climb) {
    return boardRenderer;
  }

  return (
    <Link onClick={onClick} href={constructClimbViewUrl(parsedParams, climb.uuid)}>
      {boardRenderer}
    </Link>
  );
};

export default ClimbCardCover;