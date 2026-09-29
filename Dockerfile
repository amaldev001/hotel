# ─────────────────────────────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS client-builder

WORKDIR /app/client

# Copy client package files first for layer caching
COPY client/package*.json ./

RUN npm ci --legacy-peer-deps

# Copy client source and build
COPY client/ ./

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────
# Stage 2: Build production server image
# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Set timezone
ARG APP_TIMEZONE=UTC
ENV TZ=$APP_TIMEZONE

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy server source code
COPY server/src ./src
COPY server/scripts ./scripts

# Copy built frontend from previous stage
COPY --from=client-builder /app/client/dist ./client/dist

# Create uploads directory with correct ownership
RUN mkdir -p uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start with dumb-init for graceful shutdown
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
