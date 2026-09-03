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

This builds the server image and starts the services. Configuration is passed via environment variables (see `.env.example` for the defaults).
