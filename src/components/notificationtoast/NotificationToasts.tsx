import React from 'react';
import styles from './NotificationToasts.module.css';
import { Avatar } from '../avatar/Avatar';

export type ChatToastData = {
  kind: 'chat';
  id: string;
  roomName: string;
  roomUuid: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  content: string;
};

/** Site-wide event notices (e.g. fishing frenzy starting/ending). */
export type EventToastData = {
  kind: 'event';
  id: string;
  icon: string;
  title: string;
  body: string;
  /** Highlight used for the accent border. */
  tone?: 'primary' | 'danger' | 'success';
  /** Tab to open when the toast is clicked. Legacy event toasts default to fishing. */
  tab?: 'fishing' | 'radio' | 'achievements' | 'rewards';
};

export type ToastData = ChatToastData | EventToastData;

interface NotificationToastsProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  onClick?: (toast: ToastData) => void;
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
          className={`${styles['toast']} ${
            toast.kind === 'event' ? styles['toast-event'] : ''
          } ${toast.kind === 'event' && toast.tone ? styles[`toast-tone-${toast.tone}`] : ''}`}
          onClick={() => {
            if (onClick) onClick(toast);
            onDismiss(toast.id);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (onClick) onClick(toast);
            onDismiss(toast.id);
          }}
        >
          {toast.kind === 'event' ? (
            <span className={styles['toast-event-icon']} aria-hidden>
              {toast.icon}
            </span>
          ) : (
            <Avatar
              src={toast.senderAvatarUrl}
              alt={toast.senderUsername}
              size={32}
              className={styles['toast-avatar']}
            />
          )}
          <div className={styles['toast-body']}>
            <div className={styles['toast-title']}>
              {toast.kind === 'event' ? toast.title : toast.roomName}
            </div>
            {toast.kind === 'chat' && (
              <div className={styles['toast-from']}>{toast.senderUsername}</div>
            )}
            <div className={styles['toast-content']}>
              {toast.kind === 'event' ? toast.body : toast.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
