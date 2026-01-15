import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';
import { IconX } from '@tabler/icons-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  ariaLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel = 'Modal' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="monix-modal-overlay" onMouseDown={onClose}>
      <div
        className="monix-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onMouseDown={e => e.stopPropagation()}
      >
        <button className="monix-modal-close" aria-label="Close" onClick={onClose}>
          <IconX size={20} />
        </button>
        <div className="monix-modal-body">{children}</div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('modal-root') || document.body;
  return ReactDOM.createPortal(modalContent, portalRoot);
};
