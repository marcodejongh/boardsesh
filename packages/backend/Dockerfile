FROM node:22-alpine AS builder

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files and install production dependencies only
COPY package.json bun.lock ./
RUN bun install --production

# Copy built files
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
