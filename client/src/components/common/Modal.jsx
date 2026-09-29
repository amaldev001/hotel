import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Focus modal container for focus trap
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full sm:max-w-lg bg-[#191715] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#2a2724] max-h-[90vh] flex flex-col focus:outline-none animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2724]">
          <h3 id="modal-title" className="text-lg font-semibold text-[#f5ede6]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#787065] hover:text-[#f5ede6] hover:bg-[#24211e] min-h-touch min-w-touch flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
