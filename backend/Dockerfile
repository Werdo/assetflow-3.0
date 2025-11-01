FROM node:18-alpine

WORKDIR /app

# Install dependencies:
# - curl: for healthcheck
# - mongodb-tools: for database backups
# - bash: for snapshot scripts
# - jq: for JSON processing in snapshot scripts
# - docker-cli: for creating container snapshots
RUN apk add --no-cache curl mongodb-tools bash jq docker-cli

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "src/server.js"]
