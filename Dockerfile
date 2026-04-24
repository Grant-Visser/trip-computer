# Stage 1 — Build frontend
FROM node:22-trixie AS frontend-builder
WORKDIR /app
# Copy root workspace manifest + lock file so npm ci works
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci
# Now copy source
COPY shared/ ./shared/
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

# Stage 2 — Build backend
FROM node:22-trixie AS backend-builder
WORKDIR /app
# Copy root workspace manifest + lock file so npm ci works
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci
# Now copy source
COPY shared/ ./shared/
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build

# Stage 3 — Production image
FROM node:22-trixie-slim AS production

# Install nginx and supervisor
RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

# Backend
WORKDIR /app/backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY backend/package.json ./

# Frontend static files
COPY --from=frontend-builder /app/frontend/dist/frontend/browser /var/www/trip-computer

# Nginx config
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/trip-computer.conf

# Data directory for SQLite
RUN mkdir -p /data && chown node:node /data

# Env defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/trip-computer.db

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/trip-computer.conf"]
