import 'server-only';
import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  BoardName,
} from '@/app/lib/types';
import { getLayoutBySlug, getSizeBySlug, getSetsBySlug } from './slug-utils';
import { isNumericId, extractUuidFromSlug, parseBoardRouteParams } from './url-utils';
import {
  MOONBOARD_LAYOUTS,
  MOONBOARD_SETS,
  MOONBOARD_SIZE,
  MoonBoardLayoutKey,
} from './moonboard-config';

// Helper to parse MoonBoard layout slug
function getMoonBoardLayoutBySlug(slug: string): { id: number; name: string } | null {
  // MoonBoard layout slugs are like "moonboard-2016", "moonboard-2024", "moonboard-masters-2017"
  const entry = Object.entries(MOONBOARD_LAYOUTS).find(([key]) => {
    // Convert key to expected slug format and compare
    return key === slug || key.replace(/-/g, '').toLowerCase() === slug.replace(/-/g, '').toLowerCase();
  });
  if (entry) {
    return { id: entry[1].id, name: entry[1].name };
  }
  return null;
}

// Helper to parse MoonBoard size slug (always returns the single size)
function getMoonBoardSizeBySlug(): { id: number; name: string } {
  return { id: MOONBOARD_SIZE.id, name: MOONBOARD_SIZE.name };
}

// Helper to parse MoonBoard set slugs
function getMoonBoardSetsBySlug(layoutKey: MoonBoardLayoutKey, setSlug: string): { id: number; name: string }[] {
  const sets = MOONBOARD_SETS[layoutKey] || [];
  const slugParts = setSlug.split('-').map((s) => s.toLowerCase());

  // Try to match sets by name
  return sets.filter((set) => {
    const setNameLower = set.name.toLowerCase().replace(/\s+/g, '-');
    return slugParts.some((part) => setNameLower.includes(part) || set.name.toLowerCase().includes(part));
  });
}

// Enhanced route parsing function that handles both slug and numeric formats
export async function parseBoardRouteParamsWithSlugs<T extends BoardRouteParameters>(
  params: T,
): Promise<T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters> {
  const { board_name, layout_id, size_id, set_ids, angle, climb_uuid } = params;

  let parsedLayoutId: number;
  let parsedSizeId: number;
  let parsedSetIds: number[];

  // Handle MoonBoard separately (uses static config instead of database)
  if (board_name === 'moonboard') {
    // Handle layout_id (slug or numeric)
    if (isNumericId(layout_id)) {
      parsedLayoutId = Number(layout_id);
    } else {
      const layout = getMoonBoardLayoutBySlug(layout_id);
      if (!layout) {
        throw new Error(`MoonBoard layout not found for slug: ${layout_id}`);
      }
      parsedLayoutId = layout.id;
    }

    // Handle size_id (slug or numeric) - MoonBoard has single size
    if (isNumericId(size_id)) {
      parsedSizeId = Number(size_id);
    } else {
      const size = getMoonBoardSizeBySlug();
      parsedSizeId = size.id;
    }

    // Handle set_ids (slug or numeric)
    const decodedSetIds = decodeURIComponent(set_ids);
    if (isNumericId(decodedSetIds.split(',')[0])) {
      parsedSetIds = decodedSetIds.split(',').map((id) => Number(id));
    } else {
      // Find the layout key to get sets
      const layoutEntry = Object.entries(MOONBOARD_LAYOUTS).find(([, l]) => l.id === parsedLayoutId);
      if (!layoutEntry) {
        throw new Error(`MoonBoard layout not found for id: ${parsedLayoutId}`);
      }
      const layoutKey = layoutEntry[0] as MoonBoardLayoutKey;
      const sets = getMoonBoardSetsBySlug(layoutKey, decodedSetIds);
      if (sets.length === 0) {
        // If no match, try to get all sets for this layout
        const allSets = MOONBOARD_SETS[layoutKey] || [];
        parsedSetIds = allSets.map((s) => s.id);
      } else {
        parsedSetIds = sets.map((set) => set.id);
      }
    }

    const parsedParams = {
      board_name: board_name as BoardName,
      layout_id: parsedLayoutId,
      size_id: parsedSizeId,
      set_ids: parsedSetIds,
      angle: Number(angle),
    };

    if (climb_uuid) {
      return {
        ...parsedParams,
        climb_uuid: extractUuidFromSlug(climb_uuid),
      } as T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : never;
    }

    return parsedParams as T extends BoardRouteParametersWithUuid ? never : ParsedBoardRouteParameters;
  }

  // Aurora boards (kilter, tension) - use database lookups
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
      climb_uuid: extractUuidFromSlug(climb_uuid),
    } as T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : never;
  }

  return parsedParams as T extends BoardRouteParametersWithUuid ? never : ParsedBoardRouteParameters;
}

/**
 * Checks whether route parameters contain numeric IDs (old URL format) vs slugs (new format),
 * then parses them accordingly. Returns both the parsed params and a flag indicating the format.
 *
 * This consolidates the repeated hasNumericParams + parse pattern used across route files.
 */
export async function parseRouteParams<T extends BoardRouteParameters>(
  params: T,
): Promise<{
  parsedParams: T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters;
  isNumericFormat: boolean;
}> {
  const isNumericFormat = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  if (isNumericFormat) {
    // For UUID routes, extract the UUID from the slug before parsing
    const paramsToPass = (params as BoardRouteParametersWithUuid).climb_uuid
      ? { ...params, climb_uuid: extractUuidFromSlug((params as BoardRouteParametersWithUuid).climb_uuid) }
      : params;
    return {
      parsedParams: parseBoardRouteParams(paramsToPass as T),
      isNumericFormat: true,
    };
  }

  return {
    parsedParams: await parseBoardRouteParamsWithSlugs(params),
    isNumericFormat: false,
  };
}
