import functools
from flask import request, jsonify
from models import Session
from db import get_session_by_token, get_user_by_uuid


def require_authentication(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Authorization token is missing"}), 401

        if not token.startswith("Bearer "):
            return jsonify({"error": "Invalid authorization header format"}), 401

        token = token.split(" ")[1]

        session = get_session_by_token(token)
        if not session or not session.is_active:
            return jsonify({"error": "Invalid or expired session"}), 401

        user = get_user_by_uuid(session.user_uuid)
        if not user:
            return jsonify({"error": "User not found"}), 404

        request.__setattr__("user", user)  # Attach user to request for downstream use

        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user = getattr(request, "user", None)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin privileges required"}), 403

        return f(*args, **kwargs)

    return decorated_function
