import { MongoClient, Db } from 'mongodb';
import { type IUser, userFromDoc, userToDoc } from '../common/models/user';
import {
  DEFAULT_GLOBAL_SETTINGS,
  globalSettingsFromDoc,
  globalSettingsToDoc,
  type IGlobalSettings,
} from '../common/models/globalSettings';
import { ISession, sessionFromDoc, sessionToDoc } from '../common/models/session';
import { type IPet, petFromDoc, petToDoc } from '../common/models/pet';
import { type IMessage, messageFromDoc, messageToDoc } from '../common/models/message';
import { type IRoom, roomFromDoc, roomToDoc } from '../common/models/room';
import { IReport, reportFromDoc, reportToDoc } from '../common/models/report';
import { appealFromDoc, appealToDoc, IAppeal } from '../common/models/appeal';
import { LogEntry, logEntryFromDoc, logEntryToDoc } from '../common/models/logEntry';
import { type IPoll, pollFromDoc, pollToDoc } from '../common/models/poll';
import {
  IPushSubscription,
  pushSubscriptionFromDoc,
} from '../common/models/pushSubscription';
import { createLogger } from './logging';
import { cacheGet, cacheSet, cacheDel } from './redis';

const log = createLogger('db');

let client: MongoClient | null = null;
let db: Db | null = null;

// ---------------------------------------------------------------------------
// In-memory TTL cache (for data that rarely changes and is small)
// ---------------------------------------------------------------------------

function memCache<T>(ttlMs: number): {
  get: (key: string) => T | null;
  set: (key: string, value: T) => void;
  del: (key: string) => void;
  clear: () => void;
} {
  const store = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      if (store.size > 500) store.clear();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    del(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const roomCache = memCache<IRoom[]>(30_000);   // 30s – rooms almost never change
const settingsCache = memCache<IGlobalSettings>(15_000); // 15s
const messagesCache = memCache<IMessage[]>(2_000); // 2s – chat messages update more often

// ---------------------------------------------------------------------------
// Redis cache key helpers
// ---------------------------------------------------------------------------

const SESSION_TTL = 60 * 60 * 24 * 2; // 2 days in seconds (matches SESSION_EXPIRES_IN default)
const USER_TTL = 5; // 5 seconds – fast enough for live game state, cuts DB load dramatically

function sessionKey(token: string) { return `sess:${token}`; }
function userKey(uuid: string) { return `usr:${uuid}`; }

export async function connectDB(uri: string) {
  log.info('Connecting to MongoDB...');
  client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    waitQueueTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db();
  log.info('MongoDB connected');

  // Create indexes
  await db.collection('users').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
  await db.collection('pets').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('pets').createIndex({ owner_uuid: 1 });
  await db.collection('messages').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('messages').createIndex({ room_uuid: 1, time_sent: -1 });
  await db.collection('rooms').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('reports').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('appeals').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('global_settings').createIndex({ key: 1 }, { unique: true });
  await db.collection('logs').createIndex({ timestamp: -1 });
  await db.collection('logs').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('polls').createIndex({ uuid: 1 }, { unique: true });
  await db.collection('push_subscriptions').createIndex({ user_uuid: 1 });
  await db.collection('push_subscriptions').createIndex({ endpoint: 1 }, { unique: true });

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
  log.info('Database indexes and default rooms ensured');
}

function ensureDB(): Db {
  if (!db) throw new Error('Database not initialized. Call connectDB first.');
  return db;
}

export async function getGlobalSettings(): Promise<IGlobalSettings> {
  const cached = settingsCache.get('features');
  if (cached) return cached;
  const database = ensureDB();
  const doc = await database.collection('global_settings').findOne({ key: 'features' });
  const settings = doc ? globalSettingsFromDoc(doc) : DEFAULT_GLOBAL_SETTINGS;
  settingsCache.set('features', settings);
  return settings;
}

export async function updateGlobalSettings(settings: IGlobalSettings): Promise<void> {
  const database = ensureDB();
  await database
    .collection('global_settings')
    .updateOne(
      { key: 'features' },
      { $set: { key: 'features', settings: globalSettingsToDoc(settings) } },
      { upsert: true }
    );
  settingsCache.del('features');
}

export async function getUserByUUID(uuid: string): Promise<IUser | null> {
  const cached = await cacheGet<IUser>(userKey(uuid));
  if (cached) return cached;

  const database = ensureDB();
  const doc = await database.collection('users').findOne({ uuid });
  if (!doc) return null;
  const user = userFromDoc(doc);
  void cacheSet(userKey(uuid), user, USER_TTL);
  return user;
}

export async function getUsersByUUID(uuids: string[]): Promise<IUser[]> {
  const unique = uuids.filter(Boolean);
  if (unique.length === 0) return [];

  // Check Redis for each UUID; fall back to MongoDB for misses
  const results = new Map<string, IUser>();
  const misses: string[] = [];

  const cached = await Promise.all(
    unique.map(async (uuid) => ({ uuid, user: await cacheGet<IUser>(userKey(uuid)) }))
  );
  for (const { uuid, user } of cached) {
    if (user) results.set(uuid, user);
    else misses.push(uuid);
  }

  if (misses.length > 0) {
    const database = ensureDB();
    const docs = await database
      .collection('users')
      .find({ uuid: { $in: misses } })
      .toArray();
    for (const doc of docs) {
      const user = userFromDoc(doc);
      results.set(user.uuid, user);
      void cacheSet(userKey(user.uuid), user, USER_TTL);
    }
  }

  return Array.from(results.values());
}

export async function getUserByUsername(username: string): Promise<IUser | null> {
  // Username lookups bypass Redis (infrequent, not on hot path)
  const database = ensureDB();
  const doc = await database.collection('users').findOne({ username });
  if (!doc) return null;
  const user = userFromDoc(doc);
  void cacheSet(userKey(user.uuid), user, USER_TTL);
  return user;
}

export async function getAllUsers(): Promise<IUser[]> {
  const database = ensureDB();
  const docs = await database.collection('users').find({}).toArray();
  return docs.map(userFromDoc);
}

export async function createUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection('users').insertOne(userToDoc(user));
  void cacheSet(userKey(user.uuid), user, USER_TTL);
}

export async function updateUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection('users').updateOne({ uuid: user.uuid }, { $set: userToDoc(user) });
  void cacheSet(userKey(user.uuid), user, USER_TTL);
}

/**
 * Persist only the activity-tracking fields (last_seen, ip_history) for a user.
 * Unlike `updateUser` (which rewrites the whole document from a possibly stale
 * in-memory copy and can clobber concurrent money/resource transactions), this
 * writes just these two fields via MongoDB $set, so it can never revert other
 * parts of the user document. It also can't interfere with the per-user write
 * lock used by `mutateUserAndSave` because it never re-reads or rewrites other
 * fields.
 */
export async function updateUserActivity(
  uuid: string,
  activity: { last_seen: number; ip_history?: { ip: string; timestamp: number }[] }
): Promise<void> {
  const database = ensureDB();
  const update: Record<string, unknown> = { last_seen: activity.last_seen };
  if (activity.ip_history) {
    update.ip_history = activity.ip_history;
  }
  await database.collection('users').updateOne({ uuid }, { $set: update as never });
  void cacheDel(userKey(uuid));
}

// ---------------------------------------------------------------------------
// Per-user write serialization
// ---------------------------------------------------------------------------
// Many handlers perform a read-modify-write on a single user document (e.g.
// money/resource transactions). Without coordination those can interleave, and
// because writes are full-document $set, the last writer clobbers earlier
// deltas — briefly reverting money/resources to a stale value. A per-user
// chain ensures each transaction reads the latest committed state and writes
// back atomically, so concurrent actions on the same account never lose updates.
// ---------------------------------------------------------------------------

const userLocks = new Map<string, Promise<void>>();

/**
 * Read the user document directly from MongoDB, bypassing the Redis cache so a
 * mutation never operates on a stale snapshot left by an earlier transaction.
 */
async function getUserByUUIDFresh(uuid: string): Promise<IUser | null> {
  const database = ensureDB();
  const doc = await database.collection('users').findOne({ uuid });
  if (!doc) return null;
  return userFromDoc(doc);
}

/**
 * Run `fn` while holding an exclusive, per-user lock. `fn` receives a freshly
 * read (Mongo, cache-bypassed) user document and returns an outcome. This
 * serializes all read-modify-write operations on a single user. If the user is
 * not found, returns `null`.
 *
 * When `changed` is true the (possibly mutated) user is persisted back to Mongo
 * and its Redis cache entry refreshed. This wraps the standard
 * "read, mutate, write" dance of the money/resource routes so concurrent
 * actions on the same account never lose updates.
 */
export async function mutateUserAndSave<T>(
  uuid: string,
  fn: (user: IUser) => Promise<{ changed: boolean; value: T }>
): Promise<T | null> {
  const prev = userLocks.get(uuid) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>(res => {
    release = res;
  });
  userLocks.set(uuid, next);

  try {
    await prev;
    const freshUser = await getUserByUUIDFresh(uuid);
    if (!freshUser) return null;

    const outcome = await fn(freshUser);
    if (!outcome) return null;

    if (outcome.changed) {
      await updateUser(freshUser);
    }
    return outcome.value;
  } finally {
    release();
    if (userLocks.get(uuid) === next) userLocks.delete(uuid);
  }
}

export async function deleteUserByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('users').deleteOne({ uuid });
  void cacheDel(userKey(uuid));
}

export async function getUserSessions(user_uuid: string): Promise<ISession[]> {
  const database = ensureDB();
  const docs = await database.collection('sessions').find({ user_uuid }).toArray();
  return docs.map(sessionFromDoc);
}

export async function getSessionByToken(token: string): Promise<ISession | null> {
  // Fast path: check Redis first (eliminates a MongoDB round-trip on every auth'd request)
  const cached = await cacheGet<ISession>(sessionKey(token));
  if (cached) return cached;

  const database = ensureDB();
  const doc = await database.collection('sessions').findOne({ token });
  if (!doc) return null;
  const session = sessionFromDoc(doc);
  // Cache for the remaining lifetime of the session
  const remainingTtl = Math.max(1, Math.floor(session.expires_at - Date.now() / 1000));
  void cacheSet(sessionKey(token), session, Math.min(remainingTtl, SESSION_TTL));
  return session;
}

export async function createSession(session: ISession): Promise<void> {
  const database = ensureDB();
  await database.collection('sessions').insertOne(sessionToDoc(session));
  const remainingTtl = Math.max(1, Math.floor(session.expires_at - Date.now() / 1000));
  void cacheSet(sessionKey(session.token), session, Math.min(remainingTtl, SESSION_TTL));
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const database = ensureDB();
  await database.collection('sessions').deleteOne({ token });
  void cacheDel(sessionKey(token));
}

export async function deleteSessionsByUserUUID(user_uuid: string): Promise<void> {
  const database = ensureDB();
  const sessions = await database.collection('sessions').find({ user_uuid }).toArray();
  await database.collection('sessions').deleteMany({ user_uuid });
  for (const s of sessions) {
    void cacheDel(sessionKey(s.token));
  }
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
  messagesCache.del(message.room_uuid);
}

export async function getMessagesByRoomUUID(room_uuid: string): Promise<IMessage[]> {
  const cached = messagesCache.get(room_uuid);
  if (cached) return cached;
  const database = ensureDB();
  const docs = await database
    .collection('messages')
    .find({ room_uuid })
    .sort({ time_sent: 1 })
    .toArray();
  const messages = docs.map(messageFromDoc);
  messagesCache.set(room_uuid, messages);
  return messages;
}

export async function getMessageByUUID(uuid: string): Promise<IMessage | null> {
  const database = ensureDB();
  const doc = await database.collection('messages').findOne({ uuid });
  return doc ? messageFromDoc(doc) : null;
}

export async function deleteMessageByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('messages').deleteOne({ uuid });
  messagesCache.clear(); // conservative invalidation – messages change rarely
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
  messagesCache.del(room_uuid);
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
  messagesCache.del(room_uuid);
}

export async function updateMessage(message: IMessage): Promise<void> {
  const database = ensureDB();
  await database
    .collection('messages')
    .updateOne({ uuid: message.uuid }, { $set: messageToDoc(message) });
  messagesCache.del(message.room_uuid);
}

export async function createRoom(room: IRoom): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').insertOne(roomToDoc(room));
}

export async function getRoomByUUID(uuid: string): Promise<IRoom | null> {
  const rooms = roomCache.get('all');
  if (rooms) {
    return rooms.find(r => r.uuid === uuid) ?? null;
  }
  const database = ensureDB();
  const doc = await database.collection('rooms').findOne({ uuid });
  return doc ? roomFromDoc(doc) : null;
}

export async function updateRoom(room: IRoom): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').updateOne({ uuid: room.uuid }, { $set: roomToDoc(room) });
  roomCache.del('all');
}

export async function deleteRoomByUUID(uuid: string): Promise<void> {
  const database = ensureDB();
  await database.collection('rooms').deleteOne({ uuid });
  roomCache.del('all');
}

export async function getAllRooms(): Promise<IRoom[]> {
  const cached = roomCache.get('all');
  if (cached) return cached;
  const database = ensureDB();
  const docs = await database.collection('rooms').find({}).toArray();
  const rooms = docs.map(roomFromDoc);
  roomCache.set('all', rooms);
  return rooms;
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

export async function createLogEntry(entry: LogEntry): Promise<void> {
  const database = ensureDB();
  await database.collection('logs').insertOne(logEntryToDoc(entry));
}

export async function getLogEntryByUUID(uuid: string): Promise<LogEntry | null> {
  const database = ensureDB();
  const doc = await database.collection('logs').findOne({ uuid });
  return doc ? logEntryFromDoc(doc) : null;
}

export async function updateLogEntry(entry: LogEntry): Promise<void> {
  const database = ensureDB();
  await database.collection('logs').updateOne({ uuid: entry.uuid }, { $set: logEntryToDoc(entry) });
}

export async function getRecentLogEntries(limit = 100): Promise<LogEntry[]> {
  const database = ensureDB();
  const docs = await database
    .collection('logs')
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  return docs.map(logEntryFromDoc);
}

export async function createPoll(poll: IPoll): Promise<void> {
  const database = ensureDB();
  await database.collection('polls').insertOne(pollToDoc(poll));
}

export async function updatePoll(poll: IPoll): Promise<void> {
  const database = ensureDB();
  await database.collection('polls').updateOne({ uuid: poll.uuid }, { $set: pollToDoc(poll) });
}

export async function getPollByUUID(uuid: string): Promise<IPoll | null> {
  const database = ensureDB();
  const doc = await database.collection('polls').findOne({ uuid });
  return doc ? pollFromDoc(doc) : null;
}

export async function getAllPolls(): Promise<IPoll[]> {
  const database = ensureDB();
  const docs = await database.collection('polls').find({}).toArray();
  return docs.map(pollFromDoc);
}

export async function upsertPushSubscription(sub: IPushSubscription): Promise<void> {
  const database = ensureDB();
  await database
    .collection('push_subscriptions')
    .updateOne({ endpoint: sub.endpoint }, { $set: sub }, { upsert: true });
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const database = ensureDB();
  await database.collection('push_subscriptions').deleteOne({ endpoint });
}

export async function getPushSubscriptionsByUserUUID(
  user_uuid: string
): Promise<IPushSubscription[]> {
  const database = ensureDB();
  const docs = await database
    .collection('push_subscriptions')
    .find({ user_uuid })
    .toArray();
  return docs.map(pushSubscriptionFromDoc);
}

export async function getAllPushSubscriptions(): Promise<IPushSubscription[]> {
  const database = ensureDB();
  const docs = await database.collection('push_subscriptions').find({}).toArray();
  return docs.map(pushSubscriptionFromDoc);
}
