import { BoardName } from '@/app/lib/types';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';
import { getLayouts, getSets, getSizes, getBoardDetails } from '@/app/lib/data/queries';

export type BoardConfigData = {
  layouts: Record<BoardName, LayoutRow[]>;
  sizes: Record<string, SizeRow[]>;
  sets: Record<string, SetRow[]>;
  details: Record<string, any>;
};

export async function getAllBoardConfigs(): Promise<BoardConfigData> {
  const boards: BoardName[] = ['kilter', 'tension'];
  const configData: BoardConfigData = {
    layouts: {} as Record<BoardName, LayoutRow[]>,
    sizes: {},
    sets: {},
    details: {}
  };

  // Fetch all layouts for all boards in parallel
  const layoutPromises = boards.map(async (board) => {
    try {
      const layouts = await getLayouts(board);
      configData.layouts[board] = layouts;
      return { board, layouts };
    } catch (error) {
      console.error(`Failed to fetch layouts for ${board}:`, error);
      configData.layouts[board] = [];
      return { board, layouts: [] };
    }
  });

  const layoutResults = await Promise.all(layoutPromises);

  // For each board and layout, fetch sizes
  const sizePromises = layoutResults.flatMap(({ board, layouts }) =>
    layouts.map(async (layout) => {
      const key = `${board}-${layout.id}`;
      try {
        const sizes = await getSizes(board, layout.id);
        configData.sizes[key] = sizes;
        return { board, layoutId: layout.id, sizes };
      } catch (error) {
        console.error(`Failed to fetch sizes for ${board}-${layout.id}:`, error);
        configData.sizes[key] = [];
        return { board, layoutId: layout.id, sizes: [] };
      }
    })
  );

  const sizeResults = await Promise.all(sizePromises);

  // For each size, fetch sets
  const setPromises = sizeResults.flatMap(({ board, layoutId, sizes }) =>
    sizes.map(async (size) => {
      const key = `${board}-${layoutId}-${size.id}`;
      try {
        const sets = await getSets(board, layoutId, size.id);
        configData.sets[key] = sets;
      } catch (error) {
        console.error(`Failed to fetch sets for ${key}:`, error);
        configData.sets[key] = [];
      }
    })
  );

  await Promise.all(setPromises);

  // Fetch board details for common configurations
  const commonConfigs = [
    { board: 'kilter' as BoardName, layoutId: 8, sizeId: 25, setIds: [26, 27, 28, 29] },
    { board: 'kilter' as BoardName, layoutId: 8, sizeId: 17, setIds: [26, 27] },
    { board: 'tension' as BoardName, layoutId: 10, sizeId: 6, setIds: [12, 13] },
    { board: 'tension' as BoardName, layoutId: 9, sizeId: 1, setIds: [8, 9, 10, 11] },
    { board: 'tension' as BoardName, layoutId: 11, sizeId: 6, setIds: [12, 13] }
  ];

  const detailPromises = commonConfigs.map(async ({ board, layoutId, sizeId, setIds }) => {
    const key = `${board}-${layoutId}-${sizeId}-${setIds.join(',')}`;
    try {
      const details = await getBoardDetails({
        board_name: board,
        layout_id: layoutId,
        size_id: sizeId,
        set_ids: setIds,
        angle: 40
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