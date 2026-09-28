import React from 'react';
import { useUiStore } from '../../stores/ui.store';
import { ConfirmationModal } from './ConfirmationModal';

export const GlobalConfirmModal: React.FC = () => {
  const { confirmConfig, hideConfirm } = useUiStore();

  return (
    <ConfirmationModal
      isOpen={!!confirmConfig}
      onClose={confirmConfig?.onCancel || hideConfirm}
      onConfirm={confirmConfig?.onConfirm || hideConfirm}
      title={confirmConfig?.title || ''}
      description={confirmConfig?.description}
      confirmText={confirmConfig?.confirmText}
      cancelText={confirmConfig?.cancelText}
      variant={confirmConfig?.variant || 'primary'}
    />
  );
};
