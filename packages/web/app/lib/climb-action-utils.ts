export type ClimbActionKey = 'tick' | 'openInApp' | 'mirror' | 'share' | 'viewDetails';

export function getExcludedClimbActions(boardName: string, viewMode: 'card' | 'list'): ClimbActionKey[] {
  const excluded: ClimbActionKey[] = [];
  if (viewMode === 'card') {
    excluded.push('tick', 'openInApp', 'mirror', 'share');
  }
  if (boardName === 'moonboard') {
    excluded.push('viewDetails');
  }
  return excluded;
}
