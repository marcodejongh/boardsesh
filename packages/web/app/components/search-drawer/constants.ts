import { SearchRequestPagination } from '@/app/lib/types';
import { PAGE_LIMIT } from '../board-page/constants';

// Default climb search parameters
export const defaultClimbSearchParameters: SearchRequestPagination = {
  minGrade: 10,
  maxGrade: 33,
  name: '',
  minAscents: 1,
  sortBy: 'ascents',
  sortOrder: 'desc',
  minRating: 1.0,
  onlyClassics: false,
  gradeAccuracy: 1,
  settername: [],
  setternameSuggestion: '',
  //@ts-expect-error TODO fix later
  holdsFilter: '',
  mirroredHolds: '',
  pageSize: PAGE_LIMIT,
  page: 0,
};
