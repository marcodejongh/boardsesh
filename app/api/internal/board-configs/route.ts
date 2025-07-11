import { NextResponse } from 'next/server';
import { BoardName } from '@/app/lib/types';
import { fetchLayouts, fetchSizes, fetchSets, fetchBoardDetails } from '@/app/components/rest-api/api';

export const runtime = 'nodejs';

type BoardConfigData = {
  layouts: Record<BoardName, any[]>;
  sizes: Record<string, any[]>;
  sets: Record<string, any[]>;
  details: Record<string, any>;
};

export async function GET() {
  try {
    const boards: BoardName[] = ['kilter', 'tension'];
    const configData: BoardConfigData = {
      layouts: {} as Record<BoardName, any[]>,
      sizes: {},
      sets: {},
      details: {},
    };

    // Fetch all layouts for all boards in parallel
    const layoutPromises = boards.map(async (board) => {
      try {
        const layouts = await fetchLayouts(board);
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
          const sizes = await fetchSizes(board, layout.id);
          configData.sizes[key] = sizes;
          return { board, layoutId: layout.id, sizes };
        } catch (error) {
          console.error(`Failed to fetch sizes for ${board}-${layout.id}:`, error);
          configData.sizes[key] = [];
          return { board, layoutId: layout.id, sizes: [] };
        }
      }),
    );

    const sizeResults = await Promise.all(sizePromises);

    // For common board configurations, also fetch sets and details
    // This helps with the most common requests on the board selector page
    const commonConfigs = [
      { board: 'kilter' as BoardName, layoutId: 8, sizeId: 25, setIds: [26, 27, 28, 29] },
      { board: 'kilter' as BoardName, layoutId: 8, sizeId: 17, setIds: [26, 27] },
      { board: 'tension' as BoardName, layoutId: 10, sizeId: 6, setIds: [12, 13] },
      { board: 'tension' as BoardName, layoutId: 9, sizeId: 1, setIds: [8, 9, 10, 11] },
      { board: 'tension' as BoardName, layoutId: 11, sizeId: 6, setIds: [12, 13] },
    ];

    const detailPromises = commonConfigs.map(async ({ board, layoutId, sizeId, setIds }) => {
      const setsKey = `${board}-${layoutId}-${sizeId}`;
      const detailsKey = `${board}-${layoutId}-${sizeId}-${setIds.join(',')}`;

      try {
        // Fetch sets
        const sets = await fetchSets(board, layoutId, sizeId);
        configData.sets[setsKey] = sets;

        // Fetch board details
        const details = await fetchBoardDetails(board, layoutId, sizeId, setIds);
        configData.details[detailsKey] = details;
      } catch (error) {
        console.error(`Failed to fetch details for ${detailsKey}:`, error);
        configData.sets[setsKey] = [];
        configData.details[detailsKey] = null;
      }
    });

    await Promise.all(detailPromises);

    return NextResponse.json(configData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching board configurations:', error);
    return NextResponse.json({ error: 'Failed to fetch board configurations' }, { status: 500 });
  }
}
