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

export const Message: React.FC<MessageProps> = ({
  user,
  message,
  onContextMenu,
  updateMessages,
}) => {
  const self = user ? user.uuid === message.sender_uuid : false;

  const sanitizeText = (text: string): string => {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  };

  type TokenType = 'text' | 'bold' | 'italic' | 'bold-italic' | 'newline' | 'mention';

  interface Token {
    type: TokenType;
    content: string | Token[];
  }

  const parseMarkdown = (text: string): Token[] => {
    const tokens: Token[] = [];
    let i = 0;

    const peek = (offset = 0): string => text[i + offset] || '';
    const consume = (count = 1): string => {
      const result = text.slice(i, i + count);
      i += count;
      return result;
    };

    const isMarkupChar = (char: string): boolean => char === '*' || char === '_';

    while (i < text.length) {
      // Check for newline
      if (peek() === '\n') {
        tokens.push({ type: 'newline', content: '' });
        consume();
        continue;
      }

      const currentChar = peek();

      // Check for triple markup (bold+italic)
      if (isMarkupChar(currentChar) && peek(1) === currentChar && peek(2) === currentChar) {
        const markup = currentChar;
        consume(3);
        const content: string[] = [];
        while (
          i < text.length &&
          !(peek() === markup && peek(1) === markup && peek(2) === markup)
        ) {
          content.push(consume());
        }
        if (peek() === markup && peek(1) === markup && peek(2) === markup) {
          consume(3);
          tokens.push({ type: 'bold-italic', content: content.join('') });
        } else {
          // Unclosed, treat as text
          tokens.push({ type: 'text', content: markup.repeat(3) + content.join('') });
        }
        continue;
      }

      // Check for double markup (bold)
      if (isMarkupChar(currentChar) && peek(1) === currentChar) {
        const markup = currentChar;
        consume(2);
        const content: string[] = [];
        while (i < text.length && !(peek() === markup && peek(1) === markup)) {
          content.push(consume());
        }
        if (peek() === markup && peek(1) === markup) {
          consume(2);
          tokens.push({ type: 'bold', content: content.join('') });
        } else {
          // Unclosed, treat as text
          tokens.push({ type: 'text', content: markup.repeat(2) + content.join('') });
        }
        continue;
      }

      // Check for single markup (italic)
      if (isMarkupChar(currentChar)) {
        const markup = currentChar;
        consume();
        const content: string[] = [];
        while (i < text.length && peek() !== markup) {
          content.push(consume());
        }
        if (peek() === markup) {
          consume();
          tokens.push({ type: 'italic', content: content.join('') });
        } else {
          // Unclosed, treat as text
          tokens.push({ type: 'text', content: markup + content.join('') });
        }
        continue;
      }

      // Check for @username mentions
      if (currentChar === '@') {
        const mentionContent: string[] = [];
        consume(); // consume '@'
        while (i < text.length && /\w/.test(peek())) {
          mentionContent.push(consume());
        }
        if (mentionContent.length > 0) {
          tokens.push({ type: 'mention', content: '@' + mentionContent.join('') });
          continue;
        } else {
          // Just a standalone '@'
          tokens.push({ type: 'text', content: '@' });
          continue;
        }
      }

      // Regular text
      const textContent: string[] = [];
      while (i < text.length && !isMarkupChar(peek()) && peek() !== '\n') {
        textContent.push(consume());
      }
      if (textContent.length > 0) {
        tokens.push({ type: 'text', content: textContent.join('') });
      }
    }

    return tokens;
  };

  const renderTokens = (tokens: Token[]): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    tokens.forEach(token => {
      switch (token.type) {
        case 'text':
          if (typeof token.content === 'string' && token.content.length > 0) {
            nodes.push(<EmojiText key={nodes.length}>{token.content}</EmojiText>);
          }
          break;
        case 'bold':
          nodes.push(
            <strong key={nodes.length}>
              <EmojiText>{token.content as string}</EmojiText>
            </strong>
          );
          break;
        case 'italic':
          nodes.push(
            <em key={nodes.length}>
              <EmojiText>{token.content as string}</EmojiText>
            </em>
          );
          break;
        case 'bold-italic':
          nodes.push(
            <strong key={nodes.length}>
              <em>
                <EmojiText>{token.content as string}</EmojiText>
              </em>
            </strong>
          );
          break;
        case 'newline':
          nodes.push(<br key={`br-${nodes.length}`} />);
          break;
        case 'mention':
          nodes.push(
            <span key={nodes.length}>
              <EmojiText className="message-mention">{token.content as string}</EmojiText>
            </span>
          );
          break;
        default:
          break;
      }
    });

    return nodes;
  };

  const renderMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return [];
    text = sanitizeText(text);
    const tokens = parseMarkdown(text);
    return renderTokens(tokens);
  };

  const handleEphemeralClick = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    e.preventDefault();
    void dismissEphemeralMessage(message.uuid);
    updateMessages();
  };

  return (
    <div
      className={`message-item ${self ? 'self' : ''} ${message.ephemeral ? 'ephemeral' : ''}`}
      onContextMenu={onContextMenu}
    >
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
            <span
              className="message-clickable"
              onClick={handleEphemeralClick}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleEphemeralClick(
                    e as unknown as React.MouseEvent<HTMLSpanElement, MouseEvent>
                  );
                }
              }}
              role="button"
              tabIndex={0}
            >
              (dismiss){' '}
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
