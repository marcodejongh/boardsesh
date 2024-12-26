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

export async function parseBoardRouteParams<T extends BoardRouteParameters>(
  params: Promise<T>,
): Promise<T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters> {
  const { board_name, layout_id, size_id, set_ids, angle, climb_uuid } = await params;

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

export const searchParamsToUrlParams = (params: SearchRequestPagination): URLSearchParams => {
  return new URLSearchParams({
    gradeAccuracy: params.gradeAccuracy.toString(),
    maxGrade: params.maxGrade.toString(),
    minAscents: params.minAscents.toString(),
    minGrade: params.minGrade.toString(),
    minRating: params.minRating.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    name: params.name,
    onlyClassics: params.onlyClassics.toString(),
    settername: params.settername,
    setternameSuggestion: params.setternameSuggestion,
    holds: params.holds,
    mirroredHolds: params.mirroredHolds,
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
  });
};

export const DEFAULT_SEARCH_PARAMS: SearchRequestPagination = {
  gradeAccuracy: 1,
  maxGrade: 33,
  minGrade: 1,
  minRating: 0,
  minAscents: 0,
  sortBy: 'ascents',
  sortOrder: 'desc',
  name: '',
  onlyClassics: false,
  settername: '',
  setternameSuggestion: '',
  holds: '',
  mirroredHolds: '',
  page: 0,
  pageSize: PAGE_LIMIT,
};

export const urlParamsToSearchParams = (urlParams: URLSearchParams): SearchRequestPagination => {
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
    holds: urlParams.get('holds') ?? DEFAULT_SEARCH_PARAMS.holds,
    mirroredHolds: urlParams.get('mirroredHolds') ?? DEFAULT_SEARCH_PARAMS.mirroredHolds,
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
) => `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${climb_uuid}`;

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
