# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build


# Stage 2: Run
FROM node:18-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 7777
CMD ["node", "dist/server.js"]
