import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.css';
import { IconX } from '@tabler/icons-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  ariaLabel?: string;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Modal',
  width,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles['modal-overlay']} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onMouseDown={e => e.stopPropagation()}
        style={width ? { width: `${width}px` } : {}}
      >
        <button className={styles['modal-close']} aria-label="Close" onClick={onClose}>
          <IconX size={15} />
        </button>
        <div className={styles['modal-body']}>{children}</div>
      </div>
    </div>
  );

  const portalRoot = document.getElementById('modal-root') || document.body;
  return ReactDOM.createPortal(modalContent, portalRoot);
};
