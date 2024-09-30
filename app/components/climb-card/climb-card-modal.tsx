import React from 'react';
import Modal from 'antd/es/modal';
import { BoulderProblem, BoardDetails } from '@/app/lib/types';
import ClimbCard from './climb-card';

type ClimbPreviewModalProps = {
  isVisible: boolean;
  onClose: () => void;
  climb?: BoulderProblem;
  boardDetails: BoardDetails;
};

const ClimbCardModal = ({ isVisible, onClose, climb, boardDetails }: ClimbPreviewModalProps) => {
  return (
    <Modal visible={isVisible} onCancel={onClose} footer={null} height="100%" width="100%" bodyStyle={{ padding: 0 }}>
      {/* Large version of the BoardRenderer */}
      <ClimbCard actions={[]} climb={climb} boardDetails={boardDetails} onCoverClick={onClose} />
    </Modal>
  );
};

export default ClimbCardModal;
