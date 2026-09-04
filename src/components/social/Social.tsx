import React, { useCallback, useEffect } from 'react';
import styles from './Social.module.css';
import type { IRoom } from '../../../server/common/models/room';
import { EmojiText } from '../EmojiText';
import { deleteMessage, editMessage, getRoomMessages, reportMessage } from '../../helpers/social';
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
import { Spinner } from '../spinner/Spinner';
import Filter from '../../../server/common/filter/filter';
import { useSocket } from '../../providers/socket';
import { PollsPanel } from '../polls/PollsPanel';

interface SocialProps {
  user: IUser;
  room: IRoom;
  setRoom: (room: IRoom) => void;
  rooms: IRoom[];
  unreadByRoom?: Record<string, number>;
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

export const Social: React.FC<SocialProps> = ({ user, room, setRoom, rooms, unreadByRoom }) => {
  const [socialView, setSocialView] = React.useState<'chat' | 'polls'>('chat');
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [messageInput, setMessageInput] = React.useState<string>('');
  const profanityFilter = React.useMemo(() => new Filter(), []);
  const messagesRef = React.useRef<IMessage[]>([]);
  const prevMessagesRef = React.useRef<IMessage[]>([]);
  const isUserNearBottomRef = React.useRef<boolean>(true);
  const currentRoomUuidRef = React.useRef<string>(room.uuid);
  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    message?: IMessage | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  const [isReportModalOpen, setIsReportModalOpen] = React.useState<boolean>(false);
  const [reportedMessage, setReportedMessage] = React.useState<IMessage | null>(null);
  const [reportReason, setReportReason] = React.useState<string>('social/chat/general');
  const [reportDetails, setReportDetails] = React.useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = React.useState<boolean>(false);
  const [editedMessage, setEditedMessage] = React.useState<IMessage | null>(null);
  const [editContent, setEditContent] = React.useState<string>('');

  const [hydrated, setHydrated] = React.useState<boolean>(false);

  const messageContainerRef = React.useRef<HTMLDivElement>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const previousMessages = prevMessagesRef.current;
    const nextMessages = messages;
    messagesRef.current = nextMessages;

    const container = messageContainerRef.current;
    if (container) {
      const prevLast = previousMessages[previousMessages.length - 1];
      const nextLast = nextMessages[nextMessages.length - 1];
      const isOptimisticReplacement =
        previousMessages.length === nextMessages.length &&
        Boolean(prevLast?.uuid?.startsWith('temp-')) &&
        Boolean(nextLast && !nextLast.uuid.startsWith('temp-'));

      if (previousMessages.length === 0) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'auto',
        });
      } else if (isUserNearBottomRef.current && !isOptimisticReplacement) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }

    prevMessagesRef.current = nextMessages;
  }, [messages]);

  useEffect(() => {
    currentRoomUuidRef.current = room.uuid;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setHydrated(false);
  }, [room.uuid]);

  const fetchMessages = useCallback(
    async (roomUUID?: string) => {
      const targetRoomUuid = roomUUID || room.uuid;
      const msgs = (await getRoomMessages(targetRoomUuid)).filter(
        m => !m.ephemeral || m.ephemeral_user_uuid === user.uuid
      );
      if (currentRoomUuidRef.current !== targetRoomUuid) return;
      setHydrated(true);
      if (!areMessagesEqual(messagesRef.current, msgs)) {
        setMessages(msgs);
      }
    },
    [room.uuid, user.uuid]
  );

  const { subscribe, request } = useSocket();

  useEffect(() => {
    const channel = `chat:${room.uuid}`;
    const unsubscribe = subscribe(channel, data => {
      if (currentRoomUuidRef.current !== room.uuid) return;
      const msgs = (data as IMessage[]).filter(
        m => !m.ephemeral || m.ephemeral_user_uuid === user.uuid
      );
      setHydrated(true);
      if (!areMessagesEqual(messagesRef.current, msgs)) {
        setMessages(msgs);
      }
    });
    return unsubscribe;
  }, [room.uuid, subscribe, user.uuid]);

  const sendMessageClick = async () => {
    if (messageInput.trim() === '') return;
    if (!room) return;
    if (room.restrict_send_to) {
      if (!hasRole(user.role, room.restrict_send_to)) {
        return;
      }
    }

    const trimmedMessage = messageInput.trim();

    // Clear input
    setMessageInput('');

    const optimisticContent = trimmedMessage.startsWith('/')
      ? 'Running command...'
      : profanityFilter.censorText(trimmedMessage);

    // Optimistically add message to UI (will be replaced by the WS snapshot)
    setMessages(prev => [
      ...prev,
      {
        uuid: 'temp-' + Date.now(),
        room_uuid: room.uuid,
        sender_uuid: user.uuid,
        sender_username: user.username,
        sender_badge: user.role,
        sender_avatar_url: user.avatar_data_uri,
        user_tag: user.equipped_cosmetics?.tag,
        nameplate: user.equipped_cosmetics?.nameplate,
        content: optimisticContent,
        time_sent: Date.now(),
        ephemeral: false,
        edited: false,
      },
    ]);

    // Send over the socket; a fresh chat snapshot is pushed on success.
    try {
      const resp = (await request(
        'chat:send',
        { room_uuid: room.uuid, content: trimmedMessage },
        'chat:send_result'
      )) as { ok: boolean; error?: string };
      if (!resp.ok) {
        setMessages(prev => prev.filter(m => !(m.uuid ?? '').startsWith('temp-')));
      }
    } catch {
      setMessages(prev => prev.filter(m => !(m.uuid ?? '').startsWith('temp-')));
    }
  };

  const reportMessageClick = async () => {
    if (!reportedMessage || !reportReason) return;

    await reportMessage(reportedMessage.uuid, reportReason, reportDetails, request);

    // Close modal and clear state
    setIsReportModalOpen(false);
    setReportedMessage(null);
    setReportReason('social/chat/general');
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

  const onMessageTouchStart = (e: React.TouchEvent<HTMLDivElement>, msg: IMessage) => {
    const touch = e.touches[0];
    if (!touch) return;
    longPressTimerRef.current = setTimeout(() => {
      onMessageContextMenu(
        {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => undefined,
        } as MouseEvent,
        msg
      );
    }, 500);
  };

  const cancelMessageLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const el = document.querySelector(
      `.${styles['social-message-input']} input`
    ) as HTMLInputElement | null;
    if (el) el.focus();
  };

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isUserNearBottomRef.current = distanceFromBottom <= 48;
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const editMessageClick = async () => {
    if (!editedMessage) return;

    await editMessage(editedMessage.uuid, editContent, request);

    // Close modal and clear state
    setIsEditModalOpen(false);
    setEditedMessage(null);
    setEditContent('');

    // Refresh messages
    await fetchMessages();
  };

  return (
    <div className={styles['social-root']}>
      <div className={styles['social-sidebar']}>
        <div className={styles['social-sidebar-inner']}>
          <h2>Social</h2>
          <div className={styles['social-sidebar-rooms']}>
            {rooms.map(r => (
              <div
                key={r.uuid}
                className={`${styles['social-room-item']} ${
                  socialView === 'chat' && r.uuid === room.uuid ? styles.active : ''
                }`}
                onClick={() => {
                  setSocialView('chat');
                  setRoom(r);
                  void fetchMessages(r.uuid);
                  hideContextMenu();
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setSocialView('chat');
                    setRoom(r);
                    void fetchMessages(r.uuid);
                    hideContextMenu();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <EmojiText>{r.name}</EmojiText>
                {socialView !== 'polls' &&
                  r.uuid !== room.uuid &&
                  (unreadByRoom?.[r.uuid] ?? 0) > 0 && (
                    <span className={styles['social-room-notif-dot']} />
                  )}
              </div>
            ))}
            <div
              key="polls"
              className={`${styles['social-room-item']} ${socialView === 'polls' ? styles.active : ''}`}
              onClick={() => setSocialView('polls')}
              onKeyDown={e => {
                if (e.key === 'Enter') setSocialView('polls');
              }}
              role="button"
              tabIndex={0}
            >
              <EmojiText>🗳️ Polls</EmojiText>
            </div>
          </div>
        </div>
      </div>
      <div className={styles['social-main']}>
        {socialView === 'polls' && (
          <PollsPanel canCreatePoll={user.role === 'admin' || user.role === 'owner'} />
        )}
        {socialView === 'chat' && (
          <>
            <h2>
              <EmojiText>{room.name}</EmojiText>
            </h2>
            <div className={styles['message-container']} ref={messageContainerRef}>
              {!hydrated && (
                <div className={styles['loading-messages']}>
                  <Spinner size={48} />
                </div>
              )}
              {hydrated && messages.length === 0 && (
                <div className={styles['no-messages']}>
                  No messages yet. Start the conversation!
                </div>
              )}
              {hydrated &&
                messages.length > 0 &&
                messages.map(msg => (
                  <Message
                    key={msg.uuid}
                    user={user}
                    message={msg}
                    onContextMenu={e => {
                      onMessageContextMenu(e.nativeEvent, msg);
                    }}
                    onTouchStart={e => onMessageTouchStart(e, msg)}
                    onTouchEnd={cancelMessageLongPress}
                  />
                ))}
              {contextMenu.visible && contextMenu.message && (
                <div
                  className={styles['context-menu']}
                  style={{ left: contextMenu.x, top: contextMenu.y, position: 'fixed' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div
                    className={styles['context-menu-item']}
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

                  {contextMenu.message.sender_uuid !== user.uuid &&
                    contextMenu.message.sender_uuid !== 'nyx' && (
                      <div
                        className={styles['context-menu-item']}
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
                    )}
                  {(() => {
                    const reportable =
                      !contextMenu.message.deleted &&
                      contextMenu.message.sender_uuid !== user.uuid &&
                      contextMenu.message.sender_uuid !== 'nyx' &&
                      !hasRole(
                        contextMenu.message.sender_badge as 'owner' | 'admin' | 'mod' | 'helper' | 'user' || 'user',
                        'admin'
                      );
                    return (
                      <div
                        className={`${styles['context-menu-item']} ${!reportable ? styles['context-menu-item-disabled'] : ''}`}
                        onClick={() => {
                          if (!reportable) return;
                          setReportedMessage(contextMenu.message!);
                          setIsReportModalOpen(true);
                          hideContextMenu();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && reportable) {
                            setReportedMessage(contextMenu.message!);
                            setIsReportModalOpen(true);
                            hideContextMenu();
                          }
                        }}
                        role="button"
                        aria-disabled={!reportable}
                        tabIndex={reportable ? 0 : -1}
                        title={
                          reportable ? 'Report this message' : 'This message cannot be reported'
                        }
                      >
                        <IconFlag />
                        <span>{reportable ? 'Report' : 'Report unavailable'}</span>
                      </div>
                    );
                  })()}
                  {!contextMenu.message.deleted &&
                    (contextMenu.message.sender_uuid === user.uuid ||
                      (hasRole(user.role, 'helper') &&
                        (!contextMenu.message.sent_restricted ||
                          hasRole(
                            user.role,
                            contextMenu.message.restricted_role as
                              'owner' | 'admin' | 'mod' | 'helper'
                          )))) && (
                      <div
                        className={styles['context-menu-item']}
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
                  {!contextMenu.message.deleted &&
                    (contextMenu.message.sender_uuid === user.uuid ||
                      (hasRole(user.role, 'helper') &&
                        (!contextMenu.message.sent_restricted ||
                          hasRole(
                            user.role,
                            contextMenu.message.restricted_role as
                              'owner' | 'admin' | 'mod' | 'helper'
                          )))) && (
                      <div
                        className={styles['context-menu-item']}
                        onClick={() => {
                          void deleteMessage(contextMenu.message!.uuid, request);
                          void fetchMessages();
                          hideContextMenu();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            void deleteMessage(contextMenu.message!.uuid, request);
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
            <div className={styles['social-main-bottom']}>
              {!room.restrict_send_to ||
              (room.restrict_send_to && hasRole(user.role, room.restrict_send_to)) ? (
                <Input
                  placeholder="Type a message..."
                  onValueChange={value => setMessageInput(value)}
                  value={messageInput}
                  className={styles['social-message-input']}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      void sendMessageClick();
                    }
                  }}
                />
              ) : (
                <div className={styles['social-restricted-notice']}>
                  You do not have permission to send messages in this room.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <div className={styles['social-modal-content']}>
          <h2>Edit Message</h2>
          <Input value={editContent} onValueChange={value => setEditContent(value)} />
          <div className={styles['social-modal-actions']}>
            <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button color="blue" onClickAsync={editMessageClick}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)}>
        <div className={styles['social-modal-content']}>
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
          <div className={styles['social-modal-actions']}>
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
