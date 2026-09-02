import React from 'react';
import styles from './NotificationToasts.module.css';
import { Avatar } from '../avatar/Avatar';

export type ChatToastData = {
  id: string;
  roomName: string;
  roomUuid: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  content: string;
};

interface NotificationToastsProps {
  toasts: ChatToastData[];
  onDismiss: (id: string) => void;
  onClick?: (toast: ChatToastData) => void;
}

export const NotificationToasts: React.FC<NotificationToastsProps> = ({
  toasts,
  onDismiss,
  onClick,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles['toast-container']}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={styles['toast']}
          onClick={() => {
            if (onClick) onClick(toast);
            onDismiss(toast.id);
          }}
          role="button"
          tabIndex={0}
        >
          <Avatar
            src={toast.senderAvatarUrl}
            alt={toast.senderUsername}
            size={32}
            className={styles['toast-avatar']}
          />
          <div className={styles['toast-body']}>
            <div className={styles['toast-title']}>{toast.roomName}</div>
            <div className={styles['toast-from']}>{toast.senderUsername}</div>
            <div className={styles['toast-content']}>{toast.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
