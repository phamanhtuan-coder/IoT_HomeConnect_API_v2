FROM node:18-alpine3.17

# Accept DNS server as build argument
ARG DOCKER_DNS=8.8.8.8

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    build-base \
    python3

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

# Expose both development (7777) and production (8443) ports
EXPOSE 7777 8443

# Use dev script instead of build
CMD ["pnpm", "run", "dev"]
