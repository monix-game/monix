from pymongo import MongoClient
from models import User, Session
from env import MONGO_URI

client = MongoClient(MONGO_URI)
db = client.get_default_database()
users_collection = db["users"]
accounts_collection = db["accounts"]
sessions_collection = db["sessions"]
transactions_collection = db["transactions"]
conversations_collection = db["conversations"]
messages_collection = db["messages"]
logs_collection = db["logs"]


def get_user_by_uuid(uuid: str):
    document = users_collection.find_one({"uuid": uuid})
    return User.from_dict(document) if document else None


def get_user_by_username(username: str):
    document = users_collection.find_one({"username": username})
    return User.from_dict(document) if document else None


def create_user(user: User):
    users_collection.insert_one(user.to_dict())


def update_user(user: User):
    users_collection.update_one(
        {"uuid": user.uuid},
        {"$set": user.to_dict()},
    )


def get_user_sessions(user_uuid: str):
    documents = sessions_collection.find({"user_uuid": user_uuid})
    return [Session.from_dict(doc) for doc in documents]


def get_session_by_token(token: str):
    document = sessions_collection.find_one({"token": token})
    return Session.from_dict(document) if document else None


def create_session(session: Session):
    sessions_collection.insert_one(session.to_dict())
