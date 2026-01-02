import type { ClimbSearchInput, ConnectionContext } from '@boardsesh/shared-schema';
import type { ClimbSearchParams, ParsedBoardRouteParameters } from '../../../db/queries/climbs/index';
import { getClimbByUuid } from '../../../db/queries/climbs/index';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';
import { isValidBoardName } from '../../../db/queries/util/table-select';
import { validateInput } from '../shared/helpers';
import { ClimbSearchInputSchema, BoardNameSchema, ExternalUUIDSchema } from '../../../validation/schemas';
import type { ClimbSearchContext } from '../shared/types';

// Debug logging flag - only log in development
const DEBUG = process.env.NODE_ENV === 'development';

export const climbQueries = {
  /**
   * Search for climbs with various filters
   * Returns a context object that field resolvers use to fetch data lazily
   */
  searchClimbs: async (_: unknown, { input }: { input: ClimbSearchInput }, ctx: ConnectionContext): Promise<ClimbSearchContext> => {
    validateInput(ClimbSearchInputSchema, input, 'input');

    // Validate board name
    if (!isValidBoardName(input.boardName)) {
      throw new Error(`Invalid board name: ${input.boardName}. Must be 'kilter' or 'tension'`);
    }

    // Get size edges for filtering
    const sizeEdges = getSizeEdges(input.boardName, input.sizeId);
    if (!sizeEdges) {
      throw new Error(`Invalid size ID: ${input.sizeId} for board: ${input.boardName}`);
    }

    // Parse setIds from comma-separated string
    const setIds = input.setIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    // Build route parameters
    const params: ParsedBoardRouteParameters = {
      board_name: input.boardName as 'kilter' | 'tension',
      layout_id: input.layoutId,
      size_id: input.sizeId,
      set_ids: setIds,
      angle: input.angle,
    };

    // Build search parameters
    const searchParams: ClimbSearchParams = {
      page: input.page ?? 0,
      pageSize: input.pageSize ?? 20,
      gradeAccuracy: input.gradeAccuracy ? parseFloat(input.gradeAccuracy) : undefined,
      minGrade: input.minGrade,
      maxGrade: input.maxGrade,
      minAscents: input.minAscents,
      sortBy: input.sortBy ?? 'ascents',
      sortOrder: input.sortOrder ?? 'desc',
      name: input.name,
      settername: input.setter && input.setter.length > 0 ? input.setter : undefined,
      onlyTallClimbs: input.onlyTallClimbs,
      holdsFilter: input.holdsFilter as Record<string, 'ANY' | 'NOT'> | undefined,
      hideAttempted: input.hideAttempted,
      hideCompleted: input.hideCompleted,
      showOnlyAttempted: input.showOnlyAttempted,
      showOnlyCompleted: input.showOnlyCompleted,
    };

    // Get authenticated user ID for personal progress filters
    const userId = ctx.isAuthenticated && ctx.userId ? parseInt(ctx.userId, 10) : undefined;

    // Return context for field resolvers - queries are executed lazily per field
    return {
      params,
      searchParams,
      sizeEdges,
      userId,
    };
  },

  /**
   * Get a specific climb by UUID
   */
  climb: async (
    _: unknown,
    { boardName, layoutId, sizeId, setIds, angle, climbUuid }: {
      boardName: string;
      layoutId: number;
      sizeId: number;
      setIds: string;
      angle: number;
      climbUuid: string
    }
  ) => {
    // Validate board name
    validateInput(BoardNameSchema, boardName, 'boardName');

    if (!isValidBoardName(boardName)) {
      throw new Error(`Invalid board name: ${boardName}. Must be 'kilter' or 'tension'`);
    }

    // Validate all parameters
    if (layoutId <= 0) throw new Error('Invalid layoutId: must be positive');
    if (sizeId <= 0) throw new Error('Invalid sizeId: must be positive');
    if (angle < 0 || angle > 90) throw new Error('Invalid angle: must be between 0 and 90');
    validateInput(ExternalUUIDSchema, climbUuid, 'climbUuid');

    if (DEBUG) console.log('[climb] Fetching:', { boardName, layoutId, sizeId, setIds, angle, climbUuid });

    const climb = await getClimbByUuid({
      board_name: boardName as 'kilter' | 'tension',
      layout_id: layoutId,
      size_id: sizeId,
      angle,
      climb_uuid: climbUuid,
    });

    return climb;
  },
};
