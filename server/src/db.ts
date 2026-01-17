import { MongoClient, Db } from 'mongodb';
import { type IUser, userFromDoc, userToDoc } from '../common/models/user';
import { ISession, sessionFromDoc, sessionToDoc } from '../common/models/session';
import { type IPet, petFromDoc, petToDoc } from '../common/models/pet';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(uri: string) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
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

export async function getPetByUUID(uuid: string): Promise<IPet | null> {
  const database = ensureDB();
  const doc = await database.collection('pets').findOne({ uuid });
  return doc ? petFromDoc(doc) : null;
}
