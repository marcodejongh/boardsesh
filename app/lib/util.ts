import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
} from "@/app/lib/types";

export function parseBoardRouteParams<T extends BoardRouteParameters | BoardRouteParametersWithUuid>(
  params: T,
): T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters {
  const { board_name, layout_id, size_id, set_ids, angle } = params;

  const parsedParams = {
    board_name,
    layout_id: Number(layout_id),
    size_id: Number(size_id),
    set_ids: decodeURIComponent(set_ids)
      .split(",")
      .map((str) => Number(str)),
    angle: Number(angle),
  };

  // Type guard to check if `params` has the `climb_uuid` field
  if ("climb_uuid" in params) {
    // Since we know the type here, explicitly return the correct type
    return {
      ...parsedParams,
      climb_uuid: (params as BoardRouteParametersWithUuid).climb_uuid,
    } as any;
  }

  // For the non-climb_uuid case, return as ParsedBoardRouteParameters
  return parsedParams as any;
}
