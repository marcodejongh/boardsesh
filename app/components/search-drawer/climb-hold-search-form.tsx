import React, { useEffect } from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select } from 'antd';

import BoardRenderer from '../board-renderer/board-renderer';
import useHeatmapData from './use-heatmap';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { usePathname, useSearchParams } from 'next/navigation';

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const path = pathname.split('/');
    const angle = Number(path[path.length - 2]);
    if (typeof angle === 'number') {
      setAngle(angle);
    }
  }, [pathname, searchParams])
  
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [angle, setAngle] = React.useState(40);
  
  const { data: heatmapData, loading } = useHeatmapData({
  boardName: boardDetails.board_name,
  layoutId: boardDetails.layout_id,
  sizeId: boardDetails.size_id,
  setIds: boardDetails.set_ids.join(','),
  angle,
  filters: uiSearchParams
});


  const handleHoldClick = (holdId: number) => {
    const updatedHoldsFilter = { ...uiSearchParams.holdsFilter };
    const holdKey = `hold_${holdId}`;

    if (selectedState === 'ANY' || selectedState === 'NOT') {
      // @ts-expect-error
      if (updatedHoldsFilter[holdId]?.state === selectedState) {
        // @ts-expect-error
        delete updatedHoldsFilter[holdId];
      } else {
        // @ts-expect-error 
        updatedHoldsFilter[holdId] = {
          state: selectedState,
          color: selectedState === 'ANY' ? '#00CCCC' : '#FF0000',
          displayColor: selectedState === 'ANY' ? '#00CCCC' : '#FF0000',
        };
      }
    }

    updateFilters({
      holdsFilter: updatedHoldsFilter
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Any Hold' },
    { value: 'NOT', label: 'Not This Hold' },
  ];

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-4">
        <p>Select hold type:</p>
        <Select
          value={selectedState}
          onChange={(value) => setSelectedState(value as HoldState)}
          style={{ width: 200 }}
          options={stateItems}
        />
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
      </div>
      
      <p className="mb-4">Click on holds to set them to the selected type</p>
      
      <div className="w-full max-w-2xl mx-auto">
        {showHeatmap ? (
          <BoardHeatmap
            boardDetails={boardDetails}
            heatmapData={heatmapData || []}
            litUpHoldsMap={uiSearchParams.holdsFilter || {}}
            onHoldClick={handleHoldClick}
          />
        ) : (
          <BoardRenderer
            boardDetails={boardDetails}
            litUpHoldsMap={uiSearchParams.holdsFilter || {}}
            mirrored={false}
            onHoldClick={handleHoldClick}
          />
        )}
      </div>

      {Object.keys(uiSearchParams.holdsFilter || {}).length > 0 && (
        <button 
          onClick={() => updateFilters({ holdsFilter: {} })} 
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Selected Holds
        </button>
      )}
    </div>
  );
};

export default ClimbHoldSearchForm;