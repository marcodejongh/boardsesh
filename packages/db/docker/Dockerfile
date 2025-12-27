FROM node:22-bookworm-slim

# Install required packages for database setup and Node.js native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    pgloader \
    postgresql-client \
    sqlite3 \
    ca-certificates \
    curl \
    unzip \
    python3 \
    python3-pip \
    build-essential \
    make \
    g++ && \
    update-ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Database setup scripts are mounted via docker-compose volumes
# Create the tmp directory for database extraction
RUN mkdir -p /db/tmp

ENTRYPOINT ["/bin/sh", "-c"]