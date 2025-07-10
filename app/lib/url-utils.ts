import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  SearchRequestPagination,
  ClimbUuid,
  BoardDetails,
  Angle,
  BoardName,
} from '@/app/lib/types';
import { PAGE_LIMIT } from '../components/board-page/constants';
import { LayoutRow, SizeRow, SetRow } from './slug-utils';

export function parseBoardRouteParams<T extends BoardRouteParameters>(
  params: T,
): T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters {
  const { board_name, layout_id, size_id, set_ids, angle, climb_uuid } = params;

  const parsedParams = {
    board_name,
    layout_id: Number(layout_id),
    size_id: Number(size_id),
    set_ids: decodeURIComponent(set_ids)
      .split(',')
      .map((str) => Number(str)),
    angle: Number(angle),
  };

  if (climb_uuid) {
    // TypeScript knows climb_uuid is present, so return the correct type
    return {
      ...parsedParams,
      climb_uuid,
    } as T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : never;
  }

  // Return parsedParams as ParsedBoardRouteParameters when climb_uuid is absent
  return parsedParams as T extends BoardRouteParametersWithUuid ? never : ParsedBoardRouteParameters;
}

export const searchParamsToUrlParams = ({
  gradeAccuracy = DEFAULT_SEARCH_PARAMS.gradeAccuracy,
  maxGrade = DEFAULT_SEARCH_PARAMS.maxGrade,
  minGrade = DEFAULT_SEARCH_PARAMS.minGrade,
  minAscents = DEFAULT_SEARCH_PARAMS.minAscents,
  minRating = DEFAULT_SEARCH_PARAMS.minRating,
  sortBy,
  sortOrder,
  name,
  onlyClassics,
  settername,
  setternameSuggestion,
  holdsFilter,
  page,
  pageSize,
}: SearchRequestPagination): URLSearchParams => {
  return new URLSearchParams({
    gradeAccuracy: gradeAccuracy.toString(),
    maxGrade: maxGrade.toString(),
    minAscents: minAscents.toString(),
    minGrade: minGrade.toString(),
    minRating: minRating.toString(),
    sortBy,
    sortOrder,
    name,
    onlyClassics: onlyClassics.toString(),
    settername,
    setternameSuggestion,
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...Object.fromEntries(
      Object.entries(holdsFilter).map(([key, value]) => {
        return [`hold_${key}`, value.state];
      }),
    ),
  });
};
export const DEFAULT_SEARCH_PARAMS: SearchRequestPagination = {
  gradeAccuracy: 0,
  maxGrade: 0,
  minGrade: 0,
  minRating: 0,
  minAscents: 0,
  sortBy: 'ascents',
  sortOrder: 'desc',
  name: '',
  onlyClassics: false,
  settername: '',
  setternameSuggestion: '',
  holdsFilter: {},
  page: 0,
  pageSize: PAGE_LIMIT,
};

export const urlParamsToSearchParams = (urlParams: URLSearchParams): SearchRequestPagination => {
  const holdsFilter = Object.fromEntries(
    Array.from(urlParams.entries())
      .filter(([key]) => key.startsWith('hold_'))
      .map(([key, value]) => [key.replace('hold_', ''), value]),
  );

  return {
    ...DEFAULT_SEARCH_PARAMS,
    gradeAccuracy: Number(urlParams.get('gradeAccuracy') ?? DEFAULT_SEARCH_PARAMS.gradeAccuracy),
    maxGrade: Number(urlParams.get('maxGrade') ?? DEFAULT_SEARCH_PARAMS.maxGrade),
    minAscents: Number(urlParams.get('minAscents') ?? DEFAULT_SEARCH_PARAMS.minAscents),
    minGrade: Number(urlParams.get('minGrade') ?? DEFAULT_SEARCH_PARAMS.minGrade),
    minRating: Number(urlParams.get('minRating') ?? DEFAULT_SEARCH_PARAMS.minRating),
    sortBy: (urlParams.get('sortBy') ?? DEFAULT_SEARCH_PARAMS.sortBy) as 'ascents' | 'difficulty' | 'name' | 'quality',
    sortOrder: (urlParams.get('sortOrder') ?? DEFAULT_SEARCH_PARAMS.sortOrder) as 'asc' | 'desc',
    name: urlParams.get('name') ?? DEFAULT_SEARCH_PARAMS.name,
    onlyClassics: urlParams.get('onlyClassics') === 'true',
    settername: urlParams.get('settername') ?? DEFAULT_SEARCH_PARAMS.settername,
    setternameSuggestion: urlParams.get('setternameSuggestion') ?? DEFAULT_SEARCH_PARAMS.setternameSuggestion,
    //@ts-expect-error fix later
    holdsFilter: holdsFilter ?? DEFAULT_SEARCH_PARAMS.holdsFilter,
    page: Number(urlParams.get('page') ?? DEFAULT_SEARCH_PARAMS.page),
    pageSize: Number(urlParams.get('pageSize') ?? DEFAULT_SEARCH_PARAMS.pageSize),
  };
};

export const parsedRouteSearchParamsToSearchParams = (urlParams: SearchRequestPagination): SearchRequestPagination => {
  return {
    ...DEFAULT_SEARCH_PARAMS,
    ...urlParams,
  };
};

export const constructClimbViewUrl = (
  { board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters,
  climb_uuid: ClimbUuid,
  climbName?: string,
) => {
  const baseUrl = `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/`;
  if (climbName && climbName.trim()) {
    const slug = generateClimbSlug(climbName.trim());
    if (slug) {
      return `${baseUrl}${slug}-${climb_uuid}`;
    }
  }
  return `${baseUrl}${climb_uuid}`;
};

// New function to construct URLs with slug-based board parameters
export const constructClimbViewUrlWithSlugs = (
  board_name: string,
  layoutName: string,
  sizeName: string,
  setNames: string[],
  angle: number,
  climb_uuid: ClimbUuid,
  climbName?: string,
) => {
  const layoutSlug = generateLayoutSlug(layoutName);
  const sizeSlug = generateSizeSlug(sizeName);
  const setSlug = generateSetSlug(setNames);
  
  const baseUrl = `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/view/`;
  if (climbName && climbName.trim()) {
    const climbSlug = generateClimbSlug(climbName.trim());
    if (climbSlug) {
      return `${baseUrl}${climbSlug}-${climb_uuid}`;
    }
  }
  return `${baseUrl}${climb_uuid}`;
};

export const constructClimbInfoUrl = (
  { board_name }: BoardDetails,
  climb_uuid: ClimbUuid,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  angle: Angle,
) => `https://${board_name}boardapp${board_name === 'tension' ? '2' : ''}.com/climbs/${climb_uuid}`;

//`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/info/${climb_uuid}`;

export const constructClimbList = ({ board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters) =>
  `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list`;

export const constructClimbSearchUrl = (
  { board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters,
  queryString: string,
) => `/api/v1/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/search?${queryString}`;

// New slug-based URL construction functions
export const constructClimbListWithSlugs = (
  board_name: string,
  layoutName: string,
  sizeName: string,
  setNames: string[],
  angle: number,
) => {
  const layoutSlug = generateLayoutSlug(layoutName);
  const sizeSlug = generateSizeSlug(sizeName);
  const setSlug = generateSetSlug(setNames);
  return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/list`;
};

export const generateClimbSlug = (climbName: string): string => {
  return climbName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const generateLayoutSlug = (layoutName: string): string => {
  const baseSlug = layoutName
    .toLowerCase()
    .trim()
    .replace(/^(kilter|tension|decoy)\s+board\s+/i, '') // Remove board name prefix
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Handle Tension board specific cases
  if (baseSlug === 'original-layout') {
    return 'original';
  }
  
  // Replace numbers with words for better readability
  if (baseSlug.startsWith('2-')) {
    return baseSlug.replace('2-', 'two-');
  }
  
  return baseSlug;
};

export const generateSizeSlug = (sizeName: string): string => {
  // Extract size dimensions (e.g., "12 x 12 Commercial" -> "12x12")
  const sizeMatch = sizeName.match(/(\d+)\s*x\s*(\d+)/i);
  if (sizeMatch) {
    return `${sizeMatch[1]}x${sizeMatch[2]}`;
  }
  // Fallback to general slug generation
  return sizeName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const generateSetSlug = (setNames: string[]): string => {
  return setNames
    .map(name => {
      const lowercaseName = name.toLowerCase().trim();
      
      // Handle homewall-specific set names
      if (lowercaseName.includes('auxiliary') && lowercaseName.includes('kickboard')) {
        return 'aux-kicker';
      }
      if (lowercaseName.includes('mainline') && lowercaseName.includes('kickboard')) {
        return 'main-kicker';
      }
      if (lowercaseName.includes('auxiliary')) {
        return 'aux';
      }
      if (lowercaseName.includes('mainline')) {
        return 'main';
      }
      
      // Handle original kilter/tension set names
      let result = lowercaseName
        .replace(/\s+ons?$/i, '') // Remove "on" or "ons" suffix
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
      
      // Extract just 'bolt' or 'screw' if it starts with those
      if (result.startsWith('bolt')) {
        result = 'bolt';
      } else if (result.startsWith('screw')) {
        result = 'screw';
      }
      
      return result;
    })
    .sort((a, b) => b.localeCompare(a)) // Sort alphabetically descending
    .join('_'); // Use underscore as delimiter between sets
};

export const extractUuidFromSlug = (slugOrUuid: string): string => {
  // Match 32 hex characters (UUID without hyphens) - could be at end of string or standalone
  const uuidRegex = /[0-9A-F]{32}/i;
  const match = slugOrUuid.match(uuidRegex);
  return match ? match[0] : slugOrUuid;
};

export const isUuidOnly = (slugOrUuid: string): boolean => {
  // Check if it's exactly 32 hex characters (UUID format in the database)
  const uuidRegex = /^[0-9A-F]{32}$/i;
  return uuidRegex.test(slugOrUuid);
};

// Helper functions to determine if a parameter is numeric (old format) or slug (new format)
export const isNumericId = (value: string): boolean => {
  return /^\d+$/.test(value);
};

export const isSlugFormat = (value: string): boolean => {
  return !isNumericId(value);
};

// Helper functions to call the slug REST APIs
const getApiBaseUrl = () => {
  // For server-side calls in production, use the BASE_URL
  if (typeof window === 'undefined' && process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // For client-side calls or local development, use relative URLs
  return '';
};

const fetchLayoutBySlug = async (boardName: string, slug: string): Promise<LayoutRow | null> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/${boardName}/slugs/layout/${slug}`, {
      next: { revalidate: 31536000 } // Cache for 1 year - layouts don't change
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch layout: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching layout by slug:', error);
    throw error;
  }
};

const fetchSizeBySlug = async (boardName: string, layoutId: number, slug: string): Promise<SizeRow | null> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/${boardName}/slugs/size/${layoutId}/${slug}`, {
      next: { revalidate: 31536000 } // Cache for 1 year - sizes don't change
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch size: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching size by slug:', error);
    throw error;
  }
};

const fetchSetsBySlug = async (boardName: string, layoutId: number, sizeId: number, slug: string): Promise<SetRow[]> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/${boardName}/slugs/sets/${layoutId}/${sizeId}/${slug}`, {
      next: { revalidate: 31536000 } // Cache for 1 year - sets don't change
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching sets by slug:', error);
    throw error;
  }
};

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
    const layout = await fetchLayoutBySlug(board_name, layout_id);
    if (!layout) {
      throw new Error(`Layout not found for slug: ${layout_id}`);
    }
    parsedLayoutId = layout.id;
  }

  // Handle size_id (slug or numeric)
  if (isNumericId(size_id)) {
    parsedSizeId = Number(size_id);
  } else {
    const size = await fetchSizeBySlug(board_name, parsedLayoutId, size_id);
    if (!size) {
      throw new Error(`Size not found for slug: ${size_id}`);
    }
    parsedSizeId = size.id;
  }

  // Handle set_ids (slug or numeric)
  if (set_ids.includes(',') && set_ids.split(',').every(id => isNumericId(id.trim()))) {
    // Numeric format: "26,27"
    parsedSetIds = decodeURIComponent(set_ids).split(',').map(str => Number(str.trim()));
  } else if (isNumericId(set_ids)) {
    // Single numeric ID
    parsedSetIds = [Number(set_ids)];
  } else {
    // Slug format: "bolt-screw"
    const sets = await fetchSetsBySlug(board_name, parsedLayoutId, parsedSizeId, set_ids);
    if (sets.length === 0) {
      throw new Error(`Sets not found for slug: ${set_ids}`);
    }
    parsedSetIds = sets.map(s => s.id);
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
