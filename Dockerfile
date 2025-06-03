# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app

# Copy dependencies
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy toàn bộ source code
COPY . .

# 👉 Chạy Prisma generate
RUN npx prisma generate

# 👉 (Tuỳ chọn) đẩy schema nếu không dùng migration
# RUN npx prisma db push

# Build project
RUN pnpm run build


# Stage 2: Run
FROM node:18-slim

WORKDIR /app

# Copy compiled files & package.json
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/package*.json ./
# Nếu dùng Prisma
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
# 👈 Cần thiết nếu Prisma cần schema

# Install Python and other dependencies needed for bcrypt
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm install --omit=dev

# Required environment variables for Railway deployment:
# - DATABASE_URL: Connection string for MySQL database
# - REDIS_URL or REDIS_HOST + REDIS_PORT: Connection details for Redis
# - JWT_SECRET: Secret for JWT token generation
# - APP_SECRET: Application secret
# - EMAIL_USER and EMAIL_PASS: For email functionality
# - PORT: Automatically provided by Railway

ENV NODE_ENV=production
# Use PORT environment variable from Railway or default to 8443
EXPOSE ${PORT:-8443}
CMD ["node", "dist/server.js"]
