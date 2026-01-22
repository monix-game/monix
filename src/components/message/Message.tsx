import React from 'react';
import './Message.css';
import { formatRelativeTime, titleCase } from '../../helpers/utils';
import { EmojiText } from '../EmojiText';
import type { IUser } from '../../../server/common/models/user';
import type { IMessage } from '../../../server/common/models/message';

interface MessageProps {
  user?: IUser;
  message: IMessage;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export const Message: React.FC<MessageProps> = ({ user, message, onContextMenu }) => {
  const self = user ? user.uuid === message.sender_uuid : false;

  return (
    <div className={`message-item ${self ? 'self' : ''}`} onContextMenu={onContextMenu}>
      <div className="message-header">
        <span className="message-sender">
          <span className="message-username">{message.sender_username}</span>
          {message.sender_role && (
            <span className={`message-badge ${message.sender_role.toLowerCase()}`}>
              {titleCase(message.sender_role)}
            </span>
          )}
        </span>
        <span className="message-timestamp">{formatRelativeTime(new Date(message.time_sent))}</span>
      </div>
      <div className="message-content">
        <EmojiText>{message.content}</EmojiText>
      </div>
    </div>
  );
};
