import 'server-only';
import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  BoardName,
} from '@/app/lib/types';
import { getLayoutBySlug, getSizeBySlug, getSetsBySlug } from './slug-utils';
import { isNumericId } from './url-utils';

// Enhanced route parsing function that handles both slug and numeric formats
export async function parseBoardRouteParamsWithSlugs<T extends BoardRouteParameters>(
  params: T,
): Promise<T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters> {
  const { board_name, layout_id, size_id, set_ids, angle, climb_uuid } = params;

  let parsedLayoutId: number;
  let parsedSizeId: number;
  let parsedSetIds: number[];

  // Handle layout_id (slug or numeric)
  if (isNumericId(layout_id)) {
    parsedLayoutId = Number(layout_id);
  } else {
    if (!layout_id) {
      throw new Error(`Layout not found for slug: ${layout_id}`);
    }
    if (!board_name) {
      throw new Error(`Board name not found for slug: ${layout_id}`);
    }
    
    const layout = await getLayoutBySlug(board_name as BoardName, layout_id);
    if (!layout) {
      throw new Error(`Layout not found for slug: ${layout_id}`);
    }
    parsedLayoutId = layout.id;
  }

  // Handle size_id (slug or numeric)
  if (isNumericId(size_id)) {
    parsedSizeId = Number(size_id);
  } else {
    const size = await getSizeBySlug(board_name as BoardName, parsedLayoutId, size_id);
    if (!size) {
      throw new Error(`Size not found for slug: ${size_id}`);
    }
    parsedSizeId = size.id;
  }

  // Handle set_ids (slug or numeric)
  const decodedSetIds = decodeURIComponent(set_ids);
  if (isNumericId(decodedSetIds.split(',')[0])) {
    parsedSetIds = decodedSetIds.split(',').map((id) => Number(id));
  } else {
    const sets = await getSetsBySlug(board_name as BoardName, parsedLayoutId, parsedSizeId, decodedSetIds);
    if (!sets || sets.length === 0) {
      throw new Error(`Sets not found for slug: ${decodedSetIds}`);
    }
    parsedSetIds = sets.map((set) => set.id);
  }

  const parsedParams = {
    board_name,
    layout_id: parsedLayoutId,
    size_id: parsedSizeId,
    set_ids: parsedSetIds,
    angle: Number(angle),
  };

  if (climb_uuid) {
    return {
      ...parsedParams,
      climb_uuid,
    } as T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : never;
  }

  return parsedParams as T extends BoardRouteParametersWithUuid ? never : ParsedBoardRouteParameters;
}