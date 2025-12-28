import time

EXPIRES_IN = 3600  # 1 hour


class Session:
    def __init__(
        self, token: str, user_uuid: str, time_created: float
    ):
        self.token = token
        self.user_uuid = user_uuid
        self.time_created = time_created
        self.expires_at = time_created + EXPIRES_IN

    @property
    def is_active(self) -> bool:
        return time.time() < self.expires_at

    def to_dict(self):
        return {
            "token": self.token,
            "user_uuid": self.user_uuid,
            "time_created": self.time_created,
        }

    @staticmethod
    def from_dict(data: dict):
        return Session(
            token=data.get("token", ""),
            user_uuid=data.get("user_uuid", ""),
            time_created=data.get("time_created", ""),
        )
