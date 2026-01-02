import { MongoClient, Db, Document } from "mongodb";
import { IUser, userFromDoc, userToDoc } from "./models/user";
import { ISession, sessionFromDoc, sessionToDoc } from "./models/session";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(uri: string) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
}

function ensureDB(): Db {
  if (!db) throw new Error("Database not initialized. Call connectDB first.");
  return db;
}

export async function getUserByUUID(uuid: string): Promise<IUser | null> {
  const database = ensureDB();
  const doc = await database.collection("users").findOne({ uuid });
  return doc ? userFromDoc(doc) : null;
}

export async function getUserByUsername(username: string): Promise<IUser | null> {
  const database = ensureDB();
  const doc = await database.collection("users").findOne({ username });
  return doc ? userFromDoc(doc) : null;
}

export async function createUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection("users").insertOne(userToDoc(user));
}

export async function updateUser(user: IUser): Promise<void> {
  const database = ensureDB();
  await database.collection("users").updateOne({ uuid: user.uuid }, { $set: userToDoc(user) });
}

export async function getUserSessions(user_uuid: string): Promise<ISession[]> {
  const database = ensureDB();
  const docs = await database.collection("sessions").find({ user_uuid }).toArray();
  return docs.map(sessionFromDoc);
}

export async function getSessionByToken(token: string): Promise<ISession | null> {
  const database = ensureDB();
  const doc = await database.collection("sessions").findOne({ token });
  return doc ? sessionFromDoc(doc) : null;
}

export async function createSession(session: ISession): Promise<void> {
  const database = ensureDB();
  await database.collection("sessions").insertOne(sessionToDoc(session));
}
