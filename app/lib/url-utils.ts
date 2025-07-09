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

export const generateClimbSlug = (climbName: string): string => {
  return climbName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
