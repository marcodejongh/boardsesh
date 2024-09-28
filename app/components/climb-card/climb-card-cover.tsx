import { BoulderProblem, GetBoardDetailsResponse, ParsedBoardRouteParameters } from "@/app/lib/types";
import { constructClimbViewUrl } from "@/app/lib/url-utils";
import BoardRenderer from "@/app/components/board/board-renderer";
import BoardLitupHolds from "@/app/components/board/board-litup-holds";
import Link from "next/link";

type ClimbCardCoverProps = { 
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParameters;
  boardDetails: GetBoardDetailsResponse;
  children: React.ReactNode;
  clickable?: boolean;
}

const ClimbCardCover = ({
  climb,
  parsedParams,
  boardDetails,
  children,
  clickable,
}: ClimbCardCoverProps) => {
  const boardRenderer = (
    <BoardRenderer boardDetails={boardDetails} board_name={parsedParams.board_name}>
      {children}
    </BoardRenderer>
  );
  if (!clickable) {
    return (
      <>
        {boardRenderer}
      </>
    );
  }
  return (
    <Link href={constructClimbViewUrl(parsedParams, climb.uuid)}>
      {boardRenderer}
    </Link>
  );
};

export default ClimbCardCover;