import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  SearchRequestPagination,
  ClimbUuid,
  BoardDetails,
  Angle,
} from '@/app/lib/types';
import { PAGE_LIMIT } from '../components/board-page/constants';

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
  hideAttempted,
  hideCompleted,
  showOnlyAttempted,
  showOnlyCompleted,
  page,
  pageSize,
}: SearchRequestPagination): URLSearchParams => {
  const params: Record<string, string> = {};

  // Only add parameters that differ from defaults
  if (gradeAccuracy !== DEFAULT_SEARCH_PARAMS.gradeAccuracy) {
    params.gradeAccuracy = gradeAccuracy.toString();
  }
  if (maxGrade !== DEFAULT_SEARCH_PARAMS.maxGrade) {
    params.maxGrade = maxGrade.toString();
  }
  if (minGrade !== DEFAULT_SEARCH_PARAMS.minGrade) {
    params.minGrade = minGrade.toString();
  }
  if (minAscents !== DEFAULT_SEARCH_PARAMS.minAscents) {
    params.minAscents = minAscents.toString();
  }
  if (minRating !== DEFAULT_SEARCH_PARAMS.minRating) {
    params.minRating = minRating.toString();
  }
  if (sortBy !== DEFAULT_SEARCH_PARAMS.sortBy) {
    params.sortBy = sortBy;
  }
  if (sortOrder !== DEFAULT_SEARCH_PARAMS.sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (name && name !== DEFAULT_SEARCH_PARAMS.name) {
    params.name = name;
  }
  if (onlyClassics !== DEFAULT_SEARCH_PARAMS.onlyClassics) {
    params.onlyClassics = onlyClassics.toString();
  }
  if (settername && settername.length > 0) {
    params.settername = settername.join(',');
  }
  if (setternameSuggestion && setternameSuggestion !== DEFAULT_SEARCH_PARAMS.setternameSuggestion) {
    params.setternameSuggestion = setternameSuggestion;
  }
  if (page !== DEFAULT_SEARCH_PARAMS.page) {
    params.page = page.toString();
  }
  if (pageSize !== DEFAULT_SEARCH_PARAMS.pageSize) {
    params.pageSize = pageSize.toString();
  }
  if (hideAttempted !== DEFAULT_SEARCH_PARAMS.hideAttempted) {
    params.hideAttempted = hideAttempted.toString();
  }
  if (hideCompleted !== DEFAULT_SEARCH_PARAMS.hideCompleted) {
    params.hideCompleted = hideCompleted.toString();
  }
  if (showOnlyAttempted !== DEFAULT_SEARCH_PARAMS.showOnlyAttempted) {
    params.showOnlyAttempted = showOnlyAttempted.toString();
  }
  if (showOnlyCompleted !== DEFAULT_SEARCH_PARAMS.showOnlyCompleted) {
    params.showOnlyCompleted = showOnlyCompleted.toString();
  }

  // Add holds filter entries only if they exist
  if (holdsFilter && Object.keys(holdsFilter).length > 0) {
    Object.entries(holdsFilter).forEach(([key, value]) => {
      params[`hold_${key}`] = value.state;
    });
  }

  return new URLSearchParams(params);
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
  settername: [],
  setternameSuggestion: '',
  holdsFilter: {},
  hideAttempted: false,
  hideCompleted: false,
  showOnlyAttempted: false,
  showOnlyCompleted: false,
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
    settername: urlParams.get('settername')?.split(',').filter(s => s.length > 0) ?? DEFAULT_SEARCH_PARAMS.settername,
    setternameSuggestion: urlParams.get('setternameSuggestion') ?? DEFAULT_SEARCH_PARAMS.setternameSuggestion,
    //@ts-expect-error fix later
    holdsFilter: holdsFilter ?? DEFAULT_SEARCH_PARAMS.holdsFilter,
    hideAttempted: urlParams.get('hideAttempted') === 'true',
    hideCompleted: urlParams.get('hideCompleted') === 'true',
    showOnlyAttempted: urlParams.get('showOnlyAttempted') === 'true',
    showOnlyCompleted: urlParams.get('showOnlyCompleted') === 'true',
    page: Number(urlParams.get('page') ?? DEFAULT_SEARCH_PARAMS.page),
    pageSize: Number(urlParams.get('pageSize') ?? DEFAULT_SEARCH_PARAMS.pageSize),
  };
};

export const parsedRouteSearchParamsToSearchParams = (urlParams: SearchRequestPagination): SearchRequestPagination => {
  // Handle settername which may come as a string from URL but needs to be an array
  let settername = DEFAULT_SEARCH_PARAMS.settername;
  if (urlParams.settername) {
    // Type assertion needed because Next.js may pass this as a string from URL params
    const setternameValue = urlParams.settername as unknown;
    if (typeof setternameValue === 'string') {
      // If it's a string, split by comma
      settername = setternameValue.split(',').filter((s: string) => s.length > 0);
    } else if (Array.isArray(setternameValue)) {
      // If it's already an array, use it
      settername = setternameValue;
    }
  }

  return {
    ...DEFAULT_SEARCH_PARAMS,
    ...urlParams,
    settername,
    gradeAccuracy: Number(urlParams.gradeAccuracy ?? DEFAULT_SEARCH_PARAMS.gradeAccuracy),
    maxGrade: Number(urlParams.maxGrade ?? DEFAULT_SEARCH_PARAMS.maxGrade),
    minAscents: Number(urlParams.minAscents ?? DEFAULT_SEARCH_PARAMS.minAscents),
    minGrade: Number(urlParams.minGrade ?? DEFAULT_SEARCH_PARAMS.minGrade),
    minRating: Number(urlParams.minRating ?? DEFAULT_SEARCH_PARAMS.minRating),
    page: Number(urlParams.page ?? DEFAULT_SEARCH_PARAMS.page),
    pageSize: Number(urlParams.pageSize ?? DEFAULT_SEARCH_PARAMS.pageSize),
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

export const constructSetterStatsUrl = (
  { board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters,
  searchQuery?: string,
) => {
  const baseUrl = `/api/v1/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/setters`;
  return searchQuery ? `${baseUrl}?search=${encodeURIComponent(searchQuery)}` : baseUrl;
};

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
    .map((name) => {
      const lowercaseName = name.toLowerCase().trim();

      // Handle homewall-specific set names (supports both "Auxiliary/Mainline" and "Aux/Main" variants)
      const hasAux = lowercaseName.includes('auxiliary') || lowercaseName.includes('aux');
      const hasMain = lowercaseName.includes('mainline') || lowercaseName.includes('main');
      // Support both "kickboard" and "kicker" in set names (different sizes use different naming)
      const hasKickerVariant = lowercaseName.includes('kickboard') || lowercaseName.includes('kicker');

      if (hasAux && hasKickerVariant) {
        return 'aux-kicker';
      }
      if (hasMain && hasKickerVariant) {
        return 'main-kicker';
      }
      if (hasAux) {
        return 'aux';
      }
      if (hasMain) {
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
