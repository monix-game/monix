import { Router } from 'express';
import {
  createMessage,
  createReport,
  deleteMessageByUUID,
  getAllRooms,
  getMessageByUUID,
  getMessagesByRoomUUID,
  getRoomByUUID,
  getUserByUUID,
  updateMessage,
} from '../db';
import { requireActive } from '../middleware';
import { IMessage, messageToDoc } from '../../common/models/message';
import { v4 } from 'uuid';
import { roomToDoc } from '../../common/models/room';
import { profanityFilter } from '../index';
import { IReport } from '../../common/models/report';
import { getCategoryById } from '../../common/punishx/categories';
import { sendNyxMessage } from '../helpers/nyx';
import { handleCommand } from '../helpers/commands';

const router = Router();

router.post('/send', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { room_uuid, content } = req.body as { room_uuid: string; content: string };

  if (!room_uuid || !content) {
    return res.status(400).json({ error: 'Missing room_uuid or content' });
  }

  const room = await getRoomByUUID(room_uuid);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if user is allowed to send message in the room
  if (room.type === 'staff' && user.role === 'user') {
    return res.status(403).json({ error: 'You are not allowed to send messages in this room' });
  }

  if (room.type === 'private' && room.members && !room.members.includes(user_uuid)) {
    return res.status(403).json({ error: 'You are not allowed to send messages in this room' });
  }

  // Make sure the content is not empty after trimming
  if (content.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  // Make sure the content is not too long
  if (content.length > 300) {
    await sendNyxMessage(
      user.uuid,
      'Your message was not sent because it exceeds the maximum length of 300 characters.',
      room_uuid
    );
    return res.status(400).json({ error: 'Message content is too long' });
  }

  // Censor the message content
  const censoredContent = profanityFilter.censorText(content);

  // Check if the censored content is empty
  if (censoredContent.trim() === '' || censoredContent.replace(/\*+/g, '').trim() === '') {
    await sendNyxMessage(
      user.uuid,
      'Your message was not sent because it contains only profanity. Please adhere to our community guidelines.',
      room_uuid
    );
    return res.status(400).json({ error: 'Message content cannot be only profanity' });
  }

  // Check if the message contains links (not allowed in social rooms except for staff)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (urlRegex.test(content) && user.role === 'user') {
    await sendNyxMessage(
      user.uuid,
      'Links are not allowed in social rooms. Please use direct messaging for sharing links.',
      room_uuid
    );
    return res.status(400).json({ error: 'Messages cannot contain links' });
  }

  const originalMessage: IMessage = {
    uuid: v4(),
    sender_uuid: user.uuid,
    sender_username: user.username,
    sender_badge: user.role === 'user' ? undefined : user.role,
    sender_avatar_url: user.avatar_data_uri,
    room_uuid,
    content: censoredContent,
    time_sent: Date.now(),
    edited: false,
    shouted: false,
  };

  const processed = await handleCommand(originalMessage, user, room_uuid);

  if (processed.error) {
    return res.status(400).json({ error: processed.error });
  }

  if (!processed.message) {
    return res.status(200).json({ message: null });
  }

  const processedMessage = processed.message;

  await createMessage(processedMessage);

  res.status(201).json({ message: processedMessage });
});

router.post('/edit/:message_uuid', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { message_uuid } = req.params;
  const { content } = req.body as { content: string };

  if (!content) {
    return res.status(400).json({ error: 'Missing content' });
  }

  const message = await getMessageByUUID(message_uuid as string);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.sender_uuid !== user.uuid && user.role === 'user') {
    return res.status(403).json({ error: 'You are not allowed to edit this message' });
  }

  // Make sure the content is not empty after trimming
  if (content.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  // Make sure the content is not too long
  if (content.length > 300) {
    return res.status(400).json({ error: 'Message content is too long' });
  }

  // Censor the message content
  const censoredContent = profanityFilter.censorText(content);

  // Check if the censored content is empty
  if (censoredContent.trim() === '' || censoredContent.replaceAll(/\*+/g, '').trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be only profanity' });
  }

  message.content = censoredContent;
  message.edited = true;
  message.time_edited = Date.now();
  await updateMessage(message);

  res.status(200).json({ message });
});

router.post('/delete/:message_uuid', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { message_uuid } = req.params;

  const message = await getMessageByUUID(message_uuid as string);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.sender_uuid !== user.uuid && user.role === 'user') {
    return res.status(403).json({ error: 'You are not allowed to delete this message' });
  }

  await deleteMessageByUUID(message.uuid);

  res.status(200).json({ success: true });
});

router.get('/room/:room_uuid/messages', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { room_uuid } = req.params;

  const messages = await getMessagesByRoomUUID(room_uuid as string);

  // Dont return ephemeral messages if not for the user
  const filteredMessages = messages.filter(m => {
    if (m.ephemeral && m.ephemeral_user_uuid !== user.uuid) {
      return false;
    }
    return true;
  });

  res.status(200).json({ messages: filteredMessages.map(m => messageToDoc(m)) });
});

router.get('/rooms', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const rooms = await getAllRooms();

  // Filter the rooms:
  // - Public rooms are visible to everyone
  // - Staff rooms are visible only to users with role != 'user'
  // - Private rooms are visible only to members
  const filteredRooms = rooms.filter(r => {
    if (r.type === 'public') return true;
    if (r.type === 'staff' && user.role !== 'user') return true;
    if (r.type === 'private' && r.members && r.members.includes(user_uuid)) return true;
    return false;
  });

  res.status(200).json({ rooms: filteredRooms.map(r => roomToDoc(r)) });
});

router.post('/ephemeral/dismiss/:message_uuid', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { message_uuid } = req.params;

  const message = await getMessageByUUID(message_uuid as string);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (!message.ephemeral || message.ephemeral_user_uuid !== user.uuid) {
    return res.status(403).json({ error: 'You are not allowed to dismiss this message' });
  }

  await deleteMessageByUUID(message.uuid);

  res.status(200).json({ success: true });
});

router.post('/report', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const authUser = req.authUser;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { message_uuid, reason, details } = req.body as {
    message_uuid: string;
    reason: string;
    details?: string;
  };

  if (!message_uuid || !reason) {
    return res.status(400).json({ error: 'Missing message_uuid or reason' });
  }

  const message = await getMessageByUUID(message_uuid);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.ephemeral || message.sender_uuid === 'nyx') {
    return res.status(403).json({ error: 'You are not allowed to report this message' });
  }

  const reportedUser = await getUserByUUID(message.sender_uuid);

  if (!reportedUser) {
    return res.status(404).json({ error: 'Reported user not found' });
  }

  const category = getCategoryById(reason);

  if (!category) {
    return res.status(404).json({ error: 'Invalid report reason' });
  }

  if (!category.id.startsWith('social')) {
    return res.status(400).json({ error: 'Report reason is not valid for social reports' });
  }

  if (['owner', 'admin'].includes(reportedUser.role)) {
    return res.status(400).json({ error: 'Cannot report this message' });
  }

  const report: IReport = {
    uuid: v4(),
    reporter_uuid: user.uuid,
    message_uuid,
    message_content: message.content,
    reported_uuid: reportedUser.uuid,
    reason: category.id,
    details,
    status: 'pending',
    time_reported: Date.now(),
  };

  await createReport(report);

  res.status(201).json({ report });
});

export default router;
