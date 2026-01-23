import React from 'react';
import './Message.css';
import { formatRelativeTime, titleCase } from '../../helpers/utils';
import { EmojiText } from '../EmojiText';
import type { IUser } from '../../../server/common/models/user';
import type { IMessage } from '../../../server/common/models/message';
import { dismissEphemeralMessage } from '../../helpers/social';

interface MessageProps {
  user?: IUser;
  message: IMessage;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  updateMessages: () => void;
}

export const Message: React.FC<MessageProps> = ({ user, message, onContextMenu, updateMessages }) => {
  const self = user ? user.uuid === message.sender_uuid : false;

  const sanitizeText = (text: string): string => {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  };

  const renderMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return [];

    text = sanitizeText(text);

    const nodes: React.ReactNode[] = [];
    // Order matters: match triple asterisks first to support nested bold+italic (***text***)
    const regex = /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    const pushPlain = (s: string) => {
      if (s.length === 0) return;
      const parts = s.split('\n');
      parts.forEach((part, i) => {
        if (part.length > 0) nodes.push(<EmojiText key={nodes.length}>{part}</EmojiText>);
        if (i !== parts.length - 1) nodes.push(<br key={`br-${nodes.length}`} />);
      });
    };

    while ((m = regex.exec(text)) !== null) {
      const idx = m.index;
      if (idx > lastIndex) {
        pushPlain(text.slice(lastIndex, idx));
      }

      if (m[2]) {
        // bold+italic (triple)
        nodes.push(
          <strong key={nodes.length}>
            <em>
              <EmojiText>{m[2]}</EmojiText>
            </em>
          </strong>
        );
      } else if (m[4]) {
        // bold
        nodes.push(
          <strong key={nodes.length}>
            <EmojiText>{m[4]}</EmojiText>
          </strong>
        );
      } else if (m[6]) {
        // italic
        nodes.push(
          <em key={nodes.length}>
            <EmojiText>{m[6]}</EmojiText>
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) pushPlain(text.slice(lastIndex));

    return nodes;
  };

  const handleEphemeralClick = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    e.preventDefault();
    void dismissEphemeralMessage(message.uuid);
    updateMessages();
  };

  return (
    <div className={`message-item ${self ? 'self' : ''}`} onContextMenu={onContextMenu}>
      <div className="message-header">
        <span className="message-sender">
          <span className="message-username">
            <EmojiText>{message.sender_username}</EmojiText>
          </span>
          {message.sender_badge && (
            <span className={`message-badge ${message.sender_badge.toLowerCase()}`}>
              {titleCase(message.sender_badge)}
            </span>
          )}
        </span>
        <span className="message-timestamp">
          {message.ephemeral ? (
            <span className="message-clickable" onClick={handleEphemeralClick}>
              (Ephemeral){' '}
            </span>
          ) : (
            ''
          )}
          {message.edited ? '(Edited) ' : ''}
          {formatRelativeTime(new Date(message.time_sent))}
        </span>
      </div>
      <div className={`message-content ${message.shouted ? 'shouted' : ''}`}>
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
};
