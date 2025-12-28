class User:
    def __init__(self, uuid: str, username: str, password_hash: str, is_admin: bool, time_created: float):
        self.uuid = uuid
        self.username = username
        self.password_hash = password_hash
        self.is_admin = is_admin
        self.time_created = time_created

    def to_dict(self):
        return {
            "uuid": self.uuid,
            "username": self.username,
            "password_hash": self.password_hash,
            "is_admin": self.is_admin,
            "time_created": self.time_created,
        }

    @staticmethod
    def from_dict(data: dict):
        return User(
            uuid=data.get("uuid", ""),
            username=data.get("username", ""),
            password_hash=data.get("password_hash", ""),
            is_admin=data.get("is_admin", False),
            time_created=data.get("time_created", 0.0)
        )
