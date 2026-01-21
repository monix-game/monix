import { Router } from 'express';
import {
  createMessage,
  getAllRooms,
  getMessagesByRoomUUID,
  getRoomByUUID,
  getUserByUUID,
} from '../db';
import { requireAuth } from '../middleware';
import { IMessage, messageToDoc } from '../../common/models/message';
import { v4 } from 'uuid';
import { roomToDoc } from '../../common/models/room';
import { profanityFilter } from '../index';

const router = Router();

router.post('/send', requireAuth, async (req, res) => {
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

  // Censor the message content
  const censoredContent = profanityFilter.censorText(content);

  const message: IMessage = {
    uuid: v4(),
    sender_uuid: user.uuid,
    sender_username: user.username,
    sender_role: user.role,
    room_uuid,
    content: censoredContent,
    time_sent: Date.now(),
    edited: false,
  };

  await createMessage(message);

  res.status(201).json({ message });
});

router.get('/room/:room_uuid/messages', requireAuth, async (req, res) => {
  const { room_uuid } = req.params;

  const messages = await getMessagesByRoomUUID(room_uuid as string);

  res.status(200).json({ messages: messages.map(m => messageToDoc(m)) });
});

router.get('/rooms', requireAuth, async (req, res) => {
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

export default router;
