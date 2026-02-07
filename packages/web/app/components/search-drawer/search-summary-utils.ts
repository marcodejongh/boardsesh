import { SearchRequestPagination } from '@/app/lib/types';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';

function getGradeName(gradeId: number): string {
  const grade = TENSION_KILTER_GRADES.find((g) => g.difficulty_id === gradeId);
  return grade?.v_grade ?? `Grade ${gradeId}`;
}

export function hasActiveFilters(params: SearchRequestPagination): boolean {
  return Object.entries(params).some(([key, value]) => {
    if (key === 'holdsFilter') {
      return Object.keys(value || {}).length > 0;
    }
    return value !== DEFAULT_SEARCH_PARAMS[key as keyof typeof DEFAULT_SEARCH_PARAMS];
  });
}

export function getClimbPanelSummary(params: SearchRequestPagination): string[] {
  const parts: string[] = [];

  if (params.minGrade && params.maxGrade) {
    parts.push(`${getGradeName(params.minGrade)}-${getGradeName(params.maxGrade)}`);
  } else if (params.minGrade) {
    parts.push(`${getGradeName(params.minGrade)}+`);
  } else if (params.maxGrade) {
    parts.push(`Up to ${getGradeName(params.maxGrade)}`);
  }

  if (params.name) {
    parts.push(`"${params.name}"`);
  }

  if (params.settername.length > 0) {
    parts.push(
      params.settername.length === 1
        ? params.settername[0]
        : `${params.settername.length} setters`,
    );
  }

  return parts;
}

export function getQualityPanelSummary(params: SearchRequestPagination): string[] {
  const parts: string[] = [];

  if (params.minAscents) {
    parts.push(`${params.minAscents}+ ascents`);
  }
  if (params.minRating) {
    parts.push(`${params.minRating}+ rating`);
  }
  if (params.onlyClassics) {
    parts.push('Classics');
  }

  if (params.gradeAccuracy && params.gradeAccuracy !== DEFAULT_SEARCH_PARAMS.gradeAccuracy) {
    parts.push('Grade accuracy');
  }
  if (params.onlyTallClimbs) {
    parts.push('Tall');
  }

  return parts;
}

export function getProgressPanelSummary(params: SearchRequestPagination): string[] {
  const parts: string[] = [];

  if (params.hideAttempted) parts.push('Hide attempted');
  if (params.hideCompleted) parts.push('Hide completed');
  if (params.showOnlyAttempted) parts.push('Only attempted');
  if (params.showOnlyCompleted) parts.push('Only completed');

  return parts;
}

export function getHoldsPanelSummary(params: SearchRequestPagination): string[] {
  const holdsCount = Object.keys(params.holdsFilter || {}).length;
  if (holdsCount === 0) return [];
  return [`${holdsCount} hold${holdsCount !== 1 ? 's' : ''}`];
}

export function getSearchPillSummary(params: SearchRequestPagination): string {
  const allParts = [
    ...getClimbPanelSummary(params),
    ...getQualityPanelSummary(params),
    ...getProgressPanelSummary(params),
    ...getHoldsPanelSummary(params),
  ];

  if (allParts.length === 0) return 'Search climbs...';
  return allParts.join(' \u00B7 ');
}
