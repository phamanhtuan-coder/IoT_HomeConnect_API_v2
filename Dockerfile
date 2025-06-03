FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install nodemon globally
RUN npm install -g nodemon

# Install dependencies with --ignore-scripts to bypass the problematic install script
RUN pnpm install --ignore-scripts

# Reinstall bcrypt specifically to ensure it's properly built for this environment
RUN npm rebuild bcrypt --build-from-source

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Use dev script instead of build
CMD ["pnpm", "run", "dev"]

