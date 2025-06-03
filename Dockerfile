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
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
# 👈 Cần thiết nếu Prisma cần schema
COPY --from=builder /app/.env ./
# 👈 Cần thiết nếu bạn dùng env để kết nối DB

# Install only production dependencies
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 7777
CMD ["node", "dist/server.js"]
