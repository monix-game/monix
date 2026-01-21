import React, { useCallback, useEffect } from 'react';
import './Social.css';
import type { IRoom } from '../../../server/common/models/room';
import { EmojiText } from '../EmojiText';
import { getRoomMessages, sendMessage } from '../../helpers/social';
import type { IMessage } from '../../../server/common/models/message';
import { Input } from '../input/Input';
import type { IUser } from '../../../server/common/models/user';
import { formatRelativeTime, titleCase } from '../../helpers/utils';

interface SocialProps {
  user: IUser;
  room: IRoom;
  setRoom: (room: IRoom) => void;
  rooms: IRoom[];
}

export const Social: React.FC<SocialProps> = ({ user, room, setRoom, rooms }) => {
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [messageInput, setMessageInput] = React.useState<string>('');

  const messageContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageContainerRef.current) {
      // Scroll to bottom when messages change (smoothly)
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    const msgs = await getRoomMessages(room.uuid);
    if (messages.length !== msgs.length) setMessages(msgs);
  }, [room.uuid, messages]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessages();

    const interval = setInterval(() => {
      void fetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages, room]);

  const sendMessageClick = async () => {
    if (messageInput.trim() === '') return;

    // Send message to server
    await sendMessage(room.uuid, messageInput.trim());

    // Clear input
    setMessageInput('');

    // Refresh messages
    await fetchMessages();
  };

  return (
    <div className="social-root">
      <div className="social-sidebar">
        <div className="social-sidebar-inner">
          <h2>Social</h2>
          <div className="social-sidebar-rooms">
            {rooms.map(r => (
              <div
                key={r.uuid}
                className={`social-room-item ${r.uuid === room.uuid ? 'active' : ''}`}
                onClick={() => setRoom(r)}
              >
                <EmojiText>{r.name}</EmojiText>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="social-main">
        <h2><EmojiText>{room.name}</EmojiText></h2>
        <div className="message-container" ref={messageContainerRef}>
          {messages.map(msg => (
            <div
              key={msg.uuid}
              className={`message-item ${msg.sender_uuid === user.uuid ? 'self' : ''}`}
            >
              <div className="message-header">
                <span className="message-sender">
                  <span className="message-username">{msg.sender_username}</span>
                  {msg.sender_role ? (
                    <span className={`message-badge ${msg.sender_role.toLowerCase()}`}>
                      {titleCase(msg.sender_role)}
                    </span>
                  ) : (
                    ''
                  )}
                </span>
                <span className="message-timestamp">
                  {formatRelativeTime(new Date(msg.time_sent))}
                </span>
              </div>
              <div className="message-content">
                <EmojiText>{msg.content}</EmojiText>
              </div>
            </div>
          ))}
        </div>
        <div className="social-main-bottom">
          <Input
            placeholder="Type a message..."
            onValueChange={value => setMessageInput(value)}
            value={messageInput}
            className="social-message-input"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                void sendMessageClick();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
