# Dockerfile - Updated for TypeScript
# ─────────────────────────────────────────────────────────────────

# ─── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source
COPY src/ ./src/

# Compile TypeScript → JavaScript
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy static assets (không thay đổi)
COPY public/ ./public/

# Copy migrations (vẫn chạy từ CLI, cần ở đây)
COPY migrations/ ./migrations/
COPY seeders/ ./seeders/
COPY config/ ./config/

# Create logs directory
RUN mkdir -p logs

# Non-root user cho security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Chạy compiled JS (không cần ts-node trong production)
CMD ["node", "dist/app.js"]

# ─────────────────────────────────────────────────────────────────
# Development Dockerfile (Dockerfile.dev)
# Dùng ts-node-dev để hot reload
# ─────────────────────────────────────────────────────────────────
# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json tsconfig.json ./
# RUN npm ci
# COPY . .
# CMD ["npm", "run", "dev"]
