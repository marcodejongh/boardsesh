import { BoardName, BoardDetails } from '@/app/lib/types';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';
import { getBoardDetails, getBoardSelectorOptions } from '@/app/lib/__generated__/product-sizes-data';
import {
  MOONBOARD_ENABLED,
  MOONBOARD_LAYOUTS,
  MOONBOARD_SETS,
  MOONBOARD_SIZE,
  MoonBoardLayoutKey,
} from '@/app/lib/moonboard-config';

export type BoardConfigData = {
  layouts: Record<BoardName, LayoutRow[]>;
  sizes: Record<string, SizeRow[]>;
  sets: Record<string, SetRow[]>;
  details: Record<string, BoardDetails | null>;
};

export async function getAllBoardConfigs(): Promise<BoardConfigData> {
  // Get layouts, sizes, and sets from hardcoded data (no database query)
  const selectorOptions = getBoardSelectorOptions();

  const configData: BoardConfigData = {
    layouts: selectorOptions.layouts,
    sizes: selectorOptions.sizes,
    sets: selectorOptions.sets,
    details: {},
  };

  // Add MoonBoard configurations if enabled
  if (MOONBOARD_ENABLED) {
    // Add moonboard layouts
    configData.layouts.moonboard = Object.entries(MOONBOARD_LAYOUTS).map(([, layout]) => ({
      id: layout.id,
      name: layout.name,
    }));

    // Add sizes for each moonboard layout (same size for all)
    Object.entries(MOONBOARD_LAYOUTS).forEach(([, layout]) => {
      const sizeKey = `moonboard-${layout.id}`;
      configData.sizes[sizeKey] = [
        {
          id: MOONBOARD_SIZE.id,
          name: MOONBOARD_SIZE.name,
          description: MOONBOARD_SIZE.description,
        },
      ];

      // Add sets for each layout-size combination
      const layoutKey = Object.entries(MOONBOARD_LAYOUTS).find(
        ([, l]) => l.id === layout.id,
      )?.[0] as MoonBoardLayoutKey | undefined;

      if (layoutKey) {
        const sets = MOONBOARD_SETS[layoutKey] || [];
        const setKey = `moonboard-${layout.id}-${MOONBOARD_SIZE.id}`;
        configData.sets[setKey] = sets.map((s) => ({
          id: s.id,
          name: s.name,
        }));
      }
    });
  }

  // Fetch board details for common configurations
  const commonConfigs = [
    { board: 'kilter' as BoardName, layoutId: 8, sizeId: 25, setIds: [26, 27, 28, 29] },
    { board: 'kilter' as BoardName, layoutId: 8, sizeId: 17, setIds: [26, 27] },
    { board: 'tension' as BoardName, layoutId: 10, sizeId: 6, setIds: [12, 13] },
    { board: 'tension' as BoardName, layoutId: 9, sizeId: 1, setIds: [8, 9, 10, 11] },
    { board: 'tension' as BoardName, layoutId: 11, sizeId: 6, setIds: [12, 13] },
  ];

  const detailPromises = commonConfigs.map(async ({ board, layoutId, sizeId, setIds }) => {
    const key = `${board}-${layoutId}-${sizeId}-${setIds.join(',')}`;
    try {
      const details = await getBoardDetails({
        board_name: board,
        layout_id: layoutId,
        size_id: sizeId,
        set_ids: setIds,
      });
      configData.details[key] = details;
    } catch (error) {
      console.error(`Failed to fetch details for ${key}:`, error);
      configData.details[key] = null;
    }
  });

  await Promise.all(detailPromises);

  return configData;
}
