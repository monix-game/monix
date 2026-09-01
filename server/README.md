# Monix Server

**Run the server locally (requires Bun):**

1. cd server
2. bun install
3. Copy `.env.example` to `.env` and adjust values
4. bun run dev

**Run in production with Docker Compose (includes MongoDB):**

From the repo root:

```sh
docker compose up --build
```

This builds the server image and starts both the `server` and `mongodb` services.
Configuration is passed via environment variables (see `docker compose.yml` for the defaults).
