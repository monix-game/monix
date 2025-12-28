from flask import Blueprint, request, jsonify
from models import User, Session
from db import get_user_by_username, create_user, create_session
import uuid
import hashlib
import time

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if get_user_by_username(username):
        return jsonify({"error": "Username already exists"}), 400

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    user = User(
        uuid=str(uuid.uuid4()),
        username=username,
        password_hash=password_hash,
        is_admin=False,
        time_created=time.time(),
    )
    create_user(user)

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = get_user_by_username(username)
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    if user.password_hash != password_hash:
        return jsonify({"error": "Invalid username or password"}), 401

    # Create a session
    session_token = str(uuid.uuid4())
    session = Session(
        token=session_token, user_uuid=user.uuid, time_created=time.time()
    )
    create_session(session)

    return jsonify({"message": "Login successful", "token": session_token, "expires_at": session.expires_at}), 200
