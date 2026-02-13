import { MongoClient, Db } from 'mongodb';
import { type IUser, userFromDoc, userToDoc } from '../common/models/user';
import { ISession, sessionFromDoc, sessionToDoc } from '../common/models/session';
import { type IPet, petFromDoc, petToDoc } from '../common/models/pet';
import { type IMessage, messageFromDoc, messageToDoc } from '../common/models/message';
import { type IRoom, roomFromDoc, roomToDoc } from '../common/models/room';
import { IReport, reportFromDoc, reportToDoc } from '../common/models/report';
import { appealFromDoc, appealToDoc, IAppeal } from '../common/models/appeal';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(uri: string) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();

  // Create indexes
  await db.collection('users').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
  await db.collection('pets').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('messages').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('rooms').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('reports').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('appeals').createIndex({ uuid: 1 }, { unique: true });

  // Ensure default rooms exist
  const defaultRooms: IRoom[] = [
    { uuid: 'general', type: 'public', name: '💬 General', time_created: 0 },
    {
      uuid: 'updates',
      type: 'public',
      name: '📢 Updates',
      time_created: 0,
      restrict_send_to: 'admin',
    },
    { uuid: 'staff', type: 'staff', name: '🛠️ Staff', time_created: 0 },
  ];

  for (const room of defaultRooms) {
    const existing = await getRoomByUUID(room.uuid);
    if (!existing) {
      await createRoom(room);
    }
  }
}

function ensureDB(): Db {
  if (!db) throw new Error('Database not initialized. Call connectDB first.');
  return db;
}

export async function getUserByUUID(uuid: string): Promise<IUser | null> {
  const database = ensureDB();
  const doc = await database.collection('users').findOne({ uuid });
  return doc ? userFromDoc(doc) : null;
}

export async function getUserByUsername(username: string): Promise<IUser | null> {
  const database = ensureDB();
  const doc = await database.collection('users').findOne({ username });
  return doc ? userFromDoc(doc) : null;
}

export async function getAllUsers(): Promise<IUser[]> {
  const database = ensureDB();
  const docs = await database.collection('users').find({}).toArray();
  return docs.map(userFromDoc);
}

export async function createUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection('users').insertOne(userToDoc(user));
}

export async function updateUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection('users').updateOne({ uuid: user.uuid }, { $set: userToDoc(user) });
}

export async function deleteUserByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('users').deleteOne({ uuid });
}

export async function getUserSessions(user_uuid: string): Promise<ISession[]> {
  const database = ensureDB();
  const docs = await database.collection('sessions').find({ user_uuid }).toArray();
  return docs.map(sessionFromDoc);
}

export async function getSessionByToken(token: string): Promise<ISession | null> {
  const database = ensureDB();
  const doc = await database.collection('sessions').findOne({ token });
  return doc ? sessionFromDoc(doc) : null;
}

export async function createSession(session: ISession): Promise<void> {
  const database = ensureDB();
  await database.collection('sessions').insertOne(sessionToDoc(session));
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const database = ensureDB();
  await database.collection('sessions').deleteOne({ token });
}

export async function deleteSessionsByUserUUID(user_uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('sessions').deleteMany({ user_uuid });
}

export async function createPet(pet: IPet): Promise<void> {
  const database = ensureDB();
  await database.collection('pets').insertOne(petToDoc(pet));
}

export async function getPetsByOwnerUUID(owner_uuid: string): Promise<IPet[]> {
  const database = ensureDB();
  const docs = await database.collection('pets').find({ owner_uuid }).toArray();
  return docs.map(petFromDoc);
}

export async function updatePet(pet: IPet): Promise<void> {
  const database = ensureDB();
  await database.collection('pets').updateOne({ uuid: pet.uuid }, { $set: petToDoc(pet) });
}

export async function deletePetByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('pets').deleteOne({ uuid });
}

export async function deletePetsByOwnerUUID(owner_uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('pets').deleteMany({ owner_uuid });
}

export async function getPetByUUID(uuid: string): Promise<IPet | null> {
  const database = ensureDB();
  const doc = await database.collection('pets').findOne({ uuid });
  return doc ? petFromDoc(doc) : null;
}

export async function createMessage(message: IMessage): Promise<void> {
  const database = ensureDB();
  await database.collection('messages').insertOne(messageToDoc(message));
}

export async function getMessagesByRoomUUID(room_uuid: string): Promise<IMessage[]> {
  const database = ensureDB();
  const docs = await database.collection('messages').find({ room_uuid }).toArray();
  return docs.map(messageFromDoc);
}

export async function getMessageByUUID(uuid: string): Promise<IMessage | null> {
  const database = ensureDB();
  const doc = await database.collection('messages').findOne({ uuid });
  return doc ? messageFromDoc(doc) : null;
}

export async function deleteMessageByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('messages').deleteOne({ uuid });
}

export async function deleteMessagesByRoomUUID(
  room_uuid: string,
  numMessages?: number
): Promise<void> {
  const database = ensureDB();
  if (numMessages) {
    const docs = await database
      .collection('messages')
      .find({ room_uuid })
      .sort({ time_sent: -1 })
      .limit(numMessages)
      .toArray();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const uuidsToDelete = docs.map(doc => doc.uuid);
    await database.collection('messages').deleteMany({ uuid: { $in: uuidsToDelete } });
  } else {
    await database.collection('messages').deleteMany({ room_uuid });
  }
}

export async function markMessagesDeletedByRoomUUID(
  room_uuid: string,
  numMessages: number,
  ignoreEphemeral = true
): Promise<void> {
  const database = ensureDB();
  const docs = await database
    .collection('messages')
    .find({
      room_uuid,
      deleted: { $ne: true },
      ...(ignoreEphemeral ? { ephemeral: { $ne: true } } : {}),
    })
    .sort({ time_sent: -1 })
    .limit(numMessages)
    .toArray();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const uuidsToUpdate = docs.map(doc => doc.uuid);

  if (uuidsToUpdate.length === 0) return;

  await database.collection('messages').updateMany(
    { uuid: { $in: uuidsToUpdate } },
    {
      $set: {
        deleted: true,
        content: '',
        edited: false,
        time_edited: Date.now(),
      },
    }
  );
}

export async function updateMessage(message: IMessage): Promise<void> {
  const database = ensureDB();
  await database
    .collection('messages')
    .updateOne({ uuid: message.uuid }, { $set: messageToDoc(message) });
}

export async function createRoom(room: IRoom): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').insertOne(roomToDoc(room));
}

export async function getRoomByUUID(uuid: string): Promise<IRoom | null> {
  const database = ensureDB();
  const doc = await database.collection('rooms').findOne({ uuid });
  return doc ? roomFromDoc(doc) : null;
}

export async function updateRoom(room: IRoom): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').updateOne({ uuid: room.uuid }, { $set: roomToDoc(room) });
}

export async function deleteRoomByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').deleteOne({ uuid });
}

export async function getAllRooms(): Promise<IRoom[]> {
  const database = ensureDB();
  const docs = await database.collection('rooms').find({}).toArray();
  return docs.map(roomFromDoc);
}

export async function createReport(report: IReport): Promise<void> {
  const database = ensureDB();
  await database.collection('reports').insertOne(reportToDoc(report));
}

export async function updateReport(report: IReport): Promise<void> {
  const database = ensureDB();
  await database
    .collection('reports')
    .updateOne({ uuid: report.uuid }, { $set: reportToDoc(report) });
}

export async function getReportByUUID(uuid: string): Promise<IReport | null> {
  const database = ensureDB();
  const doc = await database.collection('reports').findOne({ uuid });
  return doc ? reportFromDoc(doc) : null;
}

export async function getAllReports(): Promise<IReport[]> {
  const database = ensureDB();
  const docs = await database.collection('reports').find({}).toArray();
  return docs.map(reportFromDoc);
}

export async function createAppeal(appeal: IAppeal): Promise<void> {
  const database = ensureDB();
  await database.collection('appeals').insertOne(appealToDoc(appeal));
}

export async function getAppealByUUID(uuid: string): Promise<IAppeal | null> {
  const database = ensureDB();
  const doc = await database.collection('appeals').findOne({ uuid });
  return doc ? appealFromDoc(doc) : null;
}

export async function getAppealsByUserUUID(user_uuid: string): Promise<IAppeal[]> {
  const database = ensureDB();
  const docs = await database.collection('appeals').find({ user_uuid }).toArray();
  return docs.map(appealFromDoc);
}

export async function getAllAppeals(): Promise<IAppeal[]> {
  const database = ensureDB();
  const docs = await database.collection('appeals').find({}).toArray();
  return docs.map(appealFromDoc);
}

export async function updateAppeal(appeal: IAppeal): Promise<void> {
  const database = ensureDB();
  await database
    .collection('appeals')
    .updateOne({ uuid: appeal.uuid }, { $set: appealToDoc(appeal) });
}
