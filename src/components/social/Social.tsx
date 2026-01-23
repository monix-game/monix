import React, { useCallback, useEffect } from 'react';
import './Social.css';
import type { IRoom } from '../../../server/common/models/room';
import { EmojiText } from '../EmojiText';
import {
  deleteMessage,
  editMessage,
  getRoomMessages,
  reportMessage,
  sendMessage,
} from '../../helpers/social';
import type { IMessage } from '../../../server/common/models/message';
import { Input } from '../input/Input';
import type { IUser } from '../../../server/common/models/user';
import { IconArrowBack, IconClipboard, IconFlag, IconPencil, IconTrash } from '@tabler/icons-react';
import { Modal } from '../modal/Modal';
import { Select } from '../select/Select';
import { Button } from '../button/Button';
import { punishXCategories } from '../../../server/common/punishx/categories';
import { Message } from '../message/Message';
import { hasRole } from '../../../server/common/roles';

interface SocialProps {
  user: IUser;
  room: IRoom;
  setRoom: (room: IRoom) => void;
  rooms: IRoom[];
}

export const Social: React.FC<SocialProps> = ({ user, room, setRoom, rooms }) => {
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [messageInput, setMessageInput] = React.useState<string>('');
  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    message?: IMessage | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  const [isReportModalOpen, setIsReportModalOpen] = React.useState<boolean>(false);
  const [reportedMessage, setReportedMessage] = React.useState<IMessage | null>(null);
  const [reportReason, setReportReason] = React.useState<string>('');
  const [reportDetails, setReportDetails] = React.useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [editedMessage, setEditedMessage] = React.useState<IMessage | null>(null);
  const [editContent, setEditContent] = React.useState<string>('');

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

  const reportMessageClick = async () => {
    if (!reportedMessage) return;

    await reportMessage(reportedMessage.uuid, reportReason, reportDetails);

    // Close modal and clear state
    setIsReportModalOpen(false);
    setReportedMessage(null);
    setReportReason('');
    setReportDetails('');
  };

  // Context menu handlers
  const onMessageContextMenu = (e: MouseEvent, msg: IMessage) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, message: msg });
  };

  const hideContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, message: null });

  useEffect(() => {
    const onClick = () => hideContextMenu();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') hideContextMenu();
    };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    hideContextMenu();
  };

  const replyToMessage = (msg: IMessage) => {
    setMessageInput(prev => `@${msg.sender_username} ${prev}`);
    hideContextMenu();
    // focus input: find the input element by class
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const el = document.querySelector('.social-message-input input') as HTMLInputElement | null;
    if (el) el.focus();
  };

  const editMessageClick = async () => {
    if (!editedMessage) return;

    await editMessage(editedMessage.uuid, editContent);

    // Close modal and clear state
    setIsEditModalOpen(false);
    setEditedMessage(null);
    setEditContent('');

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
                onClick={() => {
                  setRoom(r);
                  void fetchMessages();
                  hideContextMenu();
                }}
              >
                <EmojiText>{r.name}</EmojiText>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="social-main">
        <h2>
          <EmojiText>{room.name}</EmojiText>
        </h2>
        <div className="message-container" ref={messageContainerRef}>
          {messages.map(msg => (
            <Message
              key={msg.uuid}
              user={user}
              message={msg}
              onContextMenu={e => {
                onMessageContextMenu(e.nativeEvent, msg);
              }}
              updateMessages={() => void fetchMessages()}
            />
          ))}
          {contextMenu.visible && contextMenu.message && (
            <div
              className="context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed' }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="context-menu-item"
                onClick={() => {
                  void copyText(contextMenu.message!.content);
                  hideContextMenu();
                }}
              >
                <IconClipboard />
                <span>Copy text</span>
              </div>
              {!contextMenu.message.ephemeral && (
                <>
                  <div
                    className="context-menu-item"
                    onClick={() => {
                      replyToMessage(contextMenu.message!);
                      hideContextMenu();
                    }}
                  >
                    <IconArrowBack />
                    <span>Reply</span>
                  </div>
                  <div
                    className="context-menu-item"
                    onClick={() => {
                      setReportedMessage(contextMenu.message!);
                      setIsReportModalOpen(true);
                      hideContextMenu();
                    }}
                  >
                    <IconFlag />
                    <span>Report</span>
                  </div>
                  {(hasRole(user.role, 'helper') ||
                    user.uuid === contextMenu.message.sender_uuid) && (
                    <>
                      <div
                        className="context-menu-item"
                        onClick={() => {
                          setEditedMessage(contextMenu.message!);
                          setEditContent(contextMenu.message!.content);
                          setIsEditModalOpen(true);
                          hideContextMenu();
                        }}
                      >
                        <IconPencil />
                        <span>Edit</span>
                      </div>
                      <div
                        className="context-menu-item"
                        onClick={() => {
                          void deleteMessage(contextMenu.message!.uuid);
                          void fetchMessages();
                          hideContextMenu();
                        }}
                      >
                        <IconTrash />
                        <span>Delete</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
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

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <div className="social-modal-content">
          <h2>Edit Message</h2>
          <Input value={editContent} onValueChange={value => setEditContent(value)} />
          <div className="social-modal-actions">
            <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button color="blue" onClickAsync={editMessageClick}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)}>
        <div className="social-modal-content">
          <h2>Report Message</h2>
          <p>Please select a reason for reporting this message:</p>
          <Select
            value={reportReason}
            onChange={value => setReportReason(value)}
            options={punishXCategories
              .filter(category => category.id.startsWith('social'))
              .map(category => ({
                value: category.id,
                label: category.name,
              }))}
          />
          <Input
            placeholder="Additional details (optional)"
            value={reportDetails}
            onValueChange={value => setReportDetails(value)}
          />
          <div className="social-modal-actions">
            <Button onClick={() => setIsReportModalOpen(false)}>Cancel</Button>
            <Button color="red" onClickAsync={reportMessageClick}>
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
