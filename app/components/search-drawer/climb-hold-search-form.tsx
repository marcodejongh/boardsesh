import React from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select, Button, Form } from 'antd';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { track } from '@vercel/analytics';

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');

  const handleHoldClick = (holdId: number) => {
    const updatedHoldsFilter = { ...uiSearchParams.holdsFilter };
    const wasSelected = updatedHoldsFilter[holdId]?.state === selectedState;

    if (selectedState === 'ANY' || selectedState === 'NOT') {
      if (wasSelected) {
        delete updatedHoldsFilter[holdId];
      } else {
        updatedHoldsFilter[holdId] = {
          state: selectedState,
          color: selectedState === 'ANY' ? '#00CCCC' : '#FF0000',
          displayColor: selectedState === 'ANY' ? '#00CCCC' : '#FF0000',
        };
      }
    }

    updateFilters({
      holdsFilter: updatedHoldsFilter,
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Any Hold' },
    { value: 'NOT', label: 'Not This Hold' },
  ];

  return (
    <div className="relative">
      <Form layout="horizontal" className="mb-4">
        <Form.Item label="Select hold type" className="mb-0">
          <Select
            value={selectedState}
            onChange={(value) => {
              setSelectedState(value as HoldState);
              track('Search Hold State Changed', {
                hold_state: value,
                boardLayout: boardDetails.layout_name || '',
              });
            }}
            style={{ width: 200 }}
            options={stateItems}
          />
        </Form.Item>
      </Form>

      <p className="mb-4">Click on holds to set them to the selected type</p>

      <div className="w-full max-w-2xl mx-auto">
        <BoardHeatmap
          boardDetails={boardDetails}
          litUpHoldsMap={uiSearchParams.holdsFilter}
          onHoldClick={handleHoldClick}
        />
      </div>

      {Object.keys(uiSearchParams.holdsFilter || {}).length > 0 && (
        <Form.Item className="mt-4">
          <Button
            danger
            onClick={() => {
              const holdCount = Object.keys(uiSearchParams.holdsFilter || {}).length;
              updateFilters({ holdsFilter: {} });
              track('Clear Search Holds', {
                holds_cleared: holdCount,
                boardLayout: boardDetails.layout_name || '',
              });
            }}
          >
            Clear Selected Holds
          </Button>
        </Form.Item>
      )}
    </div>
  );
};

export default ClimbHoldSearchForm;
