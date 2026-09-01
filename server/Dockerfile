# syntax=docker/dockerfile:1

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (sharp/esbuild ship native/postinstall binaries for musl)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the server source (src/ and common/) and run it with tsx under Node
COPY src ./src
COPY common ./common

EXPOSE 6200

CMD ["npx", "tsx", "src/index.ts"]
