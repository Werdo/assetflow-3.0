#!/bin/sh

##############################################################################
# AssetFlow Backup System - Container Version
# Simplified backup script for Alpine Linux container
##############################################################################

set -eu

# Configuration
BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-assetflow}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-assetflow2025secure}"
MONGO_AUTH="${MONGO_AUTH:-admin}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $@"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $@"; }
log_error() { echo -e "${RED}[ERROR]${NC} $@"; }

log_info "===== AssetFlow Backup Started ====="
log_info "Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# MongoDB Backup using mongodump
log_info "Starting MongoDB backup..."
MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_${TIMESTAMP}"

# Check if mongodump is available
if ! command -v mongodump >/dev/null 2>&1; then
    log_error "mongodump not found. Installing MongoDB tools..."
    apk add --no-cache mongodb-tools
fi

# Execute mongodump
if mongodump \
    --host="$MONGO_HOST" \
    --port="$MONGO_PORT" \
    --db="$MONGO_DB" \
    --username="$MONGO_USER" \
    --password="$MONGO_PASS" \
    --authenticationDatabase="$MONGO_AUTH" \
    --out="$MONGO_BACKUP_DIR" 2>&1; then

    log_info "MongoDB backup completed successfully"
    log_info "Backup location: $MONGO_BACKUP_DIR"

    # Compress backup
    log_info "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "mongodb_${TIMESTAMP}.tar.gz" "mongodb_${TIMESTAMP}"
    rm -rf "mongodb_${TIMESTAMP}"
    log_info "Backup compressed: mongodb_${TIMESTAMP}.tar.gz"

    # Get backup size
    BACKUP_SIZE=$(du -sh "mongodb_${TIMESTAMP}.tar.gz" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"

else
    log_error "MongoDB backup failed"
    exit 1
fi

# Cleanup old backups (keep last 7)
log_info "Cleaning up old backups (keeping last 7)..."
cd "$BACKUP_DIR"
ls -t mongodb_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
log_info "Old backups cleaned up"

# List current backups
log_info "Current backups:"
ls -lh "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null || log_warn "No backups found"

log_info "===== AssetFlow Backup Completed Successfully ====="

exit 0
