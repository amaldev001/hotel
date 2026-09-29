import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center sm:items-start sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isDanger ? 'bg-rose-950/60 text-rose-400 border border-rose-900/40' : 'bg-brand-950/60 text-brand-400 border border-brand-900/40'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-[#a89f91]">{message}</p>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2a2724] bg-[#191715] text-[#f5ede6] hover:bg-[#24211e] font-medium text-sm min-h-touch transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-medium text-sm shadow-sm transition-colors min-h-touch ${
            isDanger
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-brand-500 hover:bg-brand-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
