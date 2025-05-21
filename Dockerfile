FROM node:18.20.8

WORKDIR /app

# Install build tools and global dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker cache
COPY package*.json pnpm-lock.yaml ./

# Install production dependencies first (these rarely change)
RUN pnpm install --prod --frozen-lockfile

# Install dev dependencies for build purposes
RUN pnpm install --frozen-lockfile

# Copy necessary files for build
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript code
RUN npx tsc

# Remove dev dependencies before copying the rest of the files
# This ensures we don't need to reinstall dependencies when only source code changes
RUN pnpm prune --prod

# Copy remaining files
COPY . .

EXPOSE 3000

CMD ["node", "dist/server.js"]
