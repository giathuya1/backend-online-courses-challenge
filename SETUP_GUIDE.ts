// ═══════════════════════════════════════════════════════════════════════
// HƯỚNG DẪN CẬP NHẬT package.json
// Copy phần "scripts" và "devDependencies" bên dưới vào package.json
// của bạn (merge, không replace toàn bộ)
// ═══════════════════════════════════════════════════════════════════════

/*
  "scripts": {
    // ── Development ──────────────────────────────────────────────────
    "dev":          "nodemon",
    "dev:ts":       "ts-node src/app.ts",

    // ── Build ────────────────────────────────────────────────────────
    "build":        "tsc --project tsconfig.json",
    "build:watch":  "tsc --watch",
    "clean":        "rimraf dist",
    "prebuild":     "npm run clean",

    // ── Production ───────────────────────────────────────────────────
    "start":        "node dist/app.js",
    "start:prod":   "NODE_ENV=production node dist/app.js",

    // ── Type checking (không emit file) ──────────────────────────────
    "type-check":   "tsc --noEmit",
    "type-check:w": "tsc --noEmit --watch",

    // ── Database (giữ nguyên sequelize-cli với JS) ────────────────────
    "db:migrate":   "sequelize db:migrate",
    "db:migrate:undo": "sequelize db:migrate:undo",
    "db:seed":      "sequelize db:seed:all",
    "db:seed:undo": "sequelize db:seed:undo:all",

    // ── Seed custom (TypeScript) ──────────────────────────────────────
    "seed:demo":    "ts-node src/scripts/seed-demo.ts",

    // ── Utils ────────────────────────────────────────────────────────
    "lint":         "eslint src --ext .ts",
    "lint:fix":     "eslint src --ext .ts --fix"
  },

  // ── Dependencies cần thêm ───────────────────────────────────────────
  "dependencies": {
    // Giữ nguyên tất cả deps hiện tại, không cần thêm gì
    // reflect-metadata cần nếu dùng experimentalDecorators
    "reflect-metadata": "^0.2.2"
  },

  "devDependencies": {
    // TypeScript core
    "typescript":        "^5.4.0",
    "ts-node":           "^10.9.2",
    "tsconfig-paths":    "^4.2.0",

    // Type definitions
    "@types/node":          "^20.0.0",
    "@types/express":       "^4.17.21",
    "@types/cors":          "^2.8.17",
    "@types/bcrypt":        "^5.0.2",
    "@types/jsonwebtoken":  "^9.0.6",
    "@types/nodemailer":    "^6.4.14",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6",
    "@types/multer":        "^1.4.11",
    "@types/node-cron":     "^3.0.11",
    "@types/winston":       "^2.4.4",

    // Build tools
    "rimraf": "^5.0.0",
    "nodemon": "^3.1.0"
  }
*/

// ═══════════════════════════════════════════════════════════════════════
// DOCKERFILE CẬP NHẬT (multi-stage build)
// ═══════════════════════════════════════════════════════════════════════

/*
# ── Stage 1: Build TypeScript ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (bao gồm devDeps để build)
RUN npm ci

# Copy source
COPY src/ ./src/

# Build TypeScript → JavaScript
RUN npm run build

# ── Stage 2: Production image ───────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Chỉ install production deps
RUN npm ci --omit=dev

# Copy built JS từ stage 1
COPY --from=builder /app/dist ./dist

# Copy static files (nếu có)
COPY public/ ./public/ 2>/dev/null || true

# Copy migrations (vẫn là JS)
COPY migrations/ ./migrations/
COPY seeders/ ./seeders/
COPY config/ ./config/

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start
CMD ["node", "dist/app.js"]
*/

// ═══════════════════════════════════════════════════════════════════════
// DOCKER-COMPOSE: Không cần thay đổi gì, chỉ cần build lại
// docker-compose up --build
// ═══════════════════════════════════════════════════════════════════════

export {}; // Để TS không báo lỗi "file has no exports"
