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

const areMessagesEqual = (msgs1: IMessage[], msgs2: IMessage[]) => {
  if (msgs1.length !== msgs2.length) return false;
  for (let i = 0; i < msgs1.length; i++) {
    if (msgs1[i].uuid !== msgs2[i].uuid) return false;
    if (msgs1[i].content !== msgs2[i].content) return false;
    if (msgs1[i].time_sent !== msgs2[i].time_sent) return false;
  }
  return true;
};

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

  const fetchMessages = useCallback(
    async (roomUUID?: string) => {
      const msgs = await getRoomMessages(roomUUID || room.uuid);
      if (!areMessagesEqual(messages, msgs)) setMessages(msgs);
    },
    [room.uuid, messages]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessages();

    const interval = setInterval(() => {
      void fetchMessages();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchMessages, room]);

  const sendMessageClick = async () => {
    if (messageInput.trim() === '') return;
    if (!room) return;
    if (room.restrict_send) {
      if (!room.sender_required_role || !hasRole(user.role, room.sender_required_role)) {
        return;
      }
    }

    // Clear input
    setMessageInput('');

    // Send message to server
    await sendMessage(room.uuid, messageInput.trim());

    // Optimistically add message to UI (will be replaced on next fetch)
    if (!messageInput.trim().startsWith('/')) {
      setMessages(prev => [
        ...prev,
        {
          uuid: 'temp-' + Date.now(),
          room_uuid: room.uuid,
          sender_uuid: user.uuid,
          sender_username: user.username,
          sender_badge: user.role,
          sender_avatar_url: user.avatar_data_uri,
          content: messageInput.trim(),
          time_sent: Date.now(),
          ephemeral: false,
          edited: false,
        } as IMessage,
      ]);
    }

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

    // Calculate adjusted position to prevent offscreen rendering
    // Estimate menu dimensions (can be refined based on content)
    const estimatedMenuWidth = 200; // Approximate width based on CSS min-width + padding
    const estimatedMenuHeight = 200; // Approximate height for typical menu
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;
    const padding = 10;

    let x = e.clientX;
    let y = e.clientY;

    // Adjust horizontal position if menu would overflow right edge
    if (x + estimatedMenuWidth > viewportWidth) {
      x = viewportWidth - estimatedMenuWidth - padding;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (y + estimatedMenuHeight > viewportHeight) {
      y = viewportHeight - estimatedMenuHeight - padding;
    }

    // Ensure menu doesn't go off left or top edge
    if (x < padding) x = padding;
    if (y < padding) y = padding;

    setContextMenu({ visible: true, x, y, message: msg });
  };

  const hideContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, message: null });

  useEffect(() => {
    const onClick = () => hideContextMenu();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') hideContextMenu();
    };
    globalThis.addEventListener('click', onClick);
    globalThis.addEventListener('keydown', onKey);
    return () => {
      globalThis.removeEventListener('click', onClick);
      globalThis.removeEventListener('keydown', onKey);
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
                  void fetchMessages(r.uuid);
                  hideContextMenu();
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setRoom(r);
                    void fetchMessages(r.uuid);
                    hideContextMenu();
                  }
                }}
                role="button"
                tabIndex={0}
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
          {messages.length === 0 && (
            <div className="no-messages">No messages yet. Start the conversation!</div>
          )}
          {messages.length > 0 &&
            messages.map(msg => (
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
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    void copyText(contextMenu.message!.content);
                    hideContextMenu();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <IconClipboard />
                <span>Copy text</span>
              </div>
              {!contextMenu.message.ephemeral && contextMenu.message.sender_uuid !== 'nyx' && (
                <>
                  <div
                    className="context-menu-item"
                    onClick={() => {
                      replyToMessage(contextMenu.message!);
                      hideContextMenu();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        replyToMessage(contextMenu.message!);
                        hideContextMenu();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <IconArrowBack />
                    <span>Reply</span>
                  </div>
                  {contextMenu.message.sender_uuid !== user.uuid && (
                    <div
                      className="context-menu-item"
                      onClick={() => {
                        setReportedMessage(contextMenu.message!);
                        setIsReportModalOpen(true);
                        hideContextMenu();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setReportedMessage(contextMenu.message!);
                          setIsReportModalOpen(true);
                          hideContextMenu();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <IconFlag />
                      <span>Report</span>
                    </div>
                  )}
                  {(hasRole(user.role, 'helper') ||
                    user.uuid === contextMenu.message.sender_uuid) && (
                    <div
                      className="context-menu-item"
                      onClick={() => {
                        setEditedMessage(contextMenu.message!);
                        setEditContent(contextMenu.message!.content);
                        setIsEditModalOpen(true);
                        hideContextMenu();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setEditedMessage(contextMenu.message!);
                          setEditContent(contextMenu.message!.content);
                          setIsEditModalOpen(true);
                          hideContextMenu();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <IconPencil />
                      <span>Edit</span>
                    </div>
                  )}
                </>
              )}
              {(hasRole(user.role, 'helper') || user.uuid === contextMenu.message.sender_uuid) && (
                <div
                  className="context-menu-item"
                  onClick={() => {
                    void deleteMessage(contextMenu.message!.uuid);
                    void fetchMessages();
                    hideContextMenu();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      void deleteMessage(contextMenu.message!.uuid);
                      void fetchMessages();
                      hideContextMenu();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <IconTrash />
                  <span>Delete</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="social-main-bottom">
          {!room.restrict_send ||
          (room.restrict_send &&
            room.sender_required_role &&
            hasRole(user.role, room.sender_required_role)) ? (
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
          ) : (
            <div className="social-restricted-notice">
              You do not have permission to send messages in this room.
            </div>
          )}
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
