import React from "react";
import { BoardProps as BoardRendererPropsProps } from "./types";
import { getBoardImageDimensions, getImageUrl } from "./util";
import BoardLitupHolds from "./board-litup-holds";

const BoardRenderer = ({
  litUpHolds = "",
  boardDetails,
  board_name
}: BoardRendererPropsProps) => {
  const { holdsData, boardWidth, boardHeight} = boardDetails;

  return (
    <svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {Object.keys(boardDetails.images_to_holds).map((imageUrl) => (
        <image
          key={imageUrl}
          href={getImageUrl(imageUrl, board_name)}
          width="100%"
          height="100%"
        />
      ))}
      <BoardLitupHolds holdsData={holdsData} litUpHolds={litUpHolds} board_name={board_name} />
    </svg>
  );
};

export default BoardRenderer;
