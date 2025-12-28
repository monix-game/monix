import dotenv
import os

dotenv.load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/monix")
PORT = int(os.getenv("PORT", 6200))
DEV = os.getenv("DEV", "False").lower() in ("true", "1", "t")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
