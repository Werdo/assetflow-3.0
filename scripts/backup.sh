#!/bin/bash

##############################################################################
# AssetFlow Backup System
# Automated backup script with configuration support
##############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup.config.json"
LOG_FILE="/var/log/assetflow/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TAG=$(date +%Y-%m-%d)
WEEK_TAG=$(date +%Y-W%U)
MONTH_TAG=$(date +%Y-%m)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "${GREEN}$@${NC}"; }
log_warn() { log "WARN" "${YELLOW}$@${NC}"; }
log_error() { log "ERROR" "${RED}$@${NC}"; }

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Read configuration
read_config() {
    local key=$1
    jq -r "$key" "$CONFIG_FILE"
}

# Check if backup is enabled
ENABLED=$(read_config '.enabled')
if [ "$ENABLED" != "true" ]; then
    log_info "Backup is disabled in configuration"
    exit 0
fi

log_info "===== AssetFlow Backup Started ====="

# Get configuration values
BACKUP_DIR=$(read_config '.destinations.local.path')
RETENTION_DAILY=$(read_config '.retention.daily')
RETENTION_WEEKLY=$(read_config '.retention.weekly')
RETENTION_MONTHLY=$(read_config '.retention.monthly')
MONGODB_ENABLED=$(read_config '.mongodb.enabled')
FILES_ENABLED=$(read_config '.files.enabled')
COMPRESSION_ENABLED=$(read_config '.compression.enabled')

# Create backup directories
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}/{database,files}
mkdir -p "$(dirname "$LOG_FILE")"

# Determine backup type (daily, weekly, monthly)
DAY_OF_WEEK=$(date +%u)  # 1 = Monday, 7 = Sunday
DAY_OF_MONTH=$(date +%d)

if [ "$DAY_OF_MONTH" == "01" ]; then
    BACKUP_TYPE="monthly"
    BACKUP_PATH="$BACKUP_DIR/monthly"
elif [ "$DAY_OF_WEEK" == "7" ]; then
    BACKUP_TYPE="weekly"
    BACKUP_PATH="$BACKUP_DIR/weekly"
else
    BACKUP_TYPE="daily"
    BACKUP_PATH="$BACKUP_DIR/daily"
fi

log_info "Backup type: $BACKUP_TYPE"
log_info "Backup path: $BACKUP_PATH"

# MongoDB Backup
if [ "$MONGODB_ENABLED" == "true" ]; then
    log_info "Starting MongoDB backup..."

    MONGO_HOST=$(read_config '.mongodb.host')
    MONGO_PORT=$(read_config '.mongodb.port')
    MONGO_DB=$(read_config '.mongodb.database')
    MONGO_USER=$(read_config '.mongodb.username')
    MONGO_PASS=$(read_config '.mongodb.password')
    MONGO_AUTH=$(read_config '.mongodb.authSource')

    MONGO_BACKUP_DIR="$BACKUP_PATH/database/mongodb_${TIMESTAMP}"

    # Run mongodump inside MongoDB container
    if docker exec mongodb mongodump \
        --host "$MONGO_HOST" \
        --port "$MONGO_PORT" \
        --db "$MONGO_DB" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASS" \
        --authenticationDatabase "$MONGO_AUTH" \
        --out "/tmp/backup_${TIMESTAMP}" 2>&1 | tee -a "$LOG_FILE"; then

        # Copy backup from container to host
        docker cp "mongodb:/tmp/backup_${TIMESTAMP}" "$MONGO_BACKUP_DIR"

        # Clean up inside container
        docker exec mongodb rm -rf "/tmp/backup_${TIMESTAMP}"

        if [ "$COMPRESSION_ENABLED" == "true" ]; then
            log_info "Compressing MongoDB backup..."
            tar -czf "${MONGO_BACKUP_DIR}.tar.gz" -C "$(dirname "$MONGO_BACKUP_DIR")" "$(basename "$MONGO_BACKUP_DIR")"
            rm -rf "$MONGO_BACKUP_DIR"
            log_info "MongoDB backup compressed: ${MONGO_BACKUP_DIR}.tar.gz"
        fi

        log_info "MongoDB backup completed successfully"
    else
        log_error "MongoDB backup failed"
    fi
fi

# Files Backup
if [ "$FILES_ENABLED" == "true" ]; then
    log_info "Starting files backup..."

    FILES_BACKUP_DIR="$BACKUP_PATH/files/files_${TIMESTAMP}"
    mkdir -p "$FILES_BACKUP_DIR"

    # Read paths from config and backup each
    jq -r '.files.paths[]' "$CONFIG_FILE" | while read -r file_path; do
        if [ -e "$file_path" ]; then
            log_info "Backing up: $file_path"
            cp -r "$file_path" "$FILES_BACKUP_DIR/"
        else
            log_warn "File not found: $file_path"
        fi
    done

    if [ "$COMPRESSION_ENABLED" == "true" ]; then
        log_info "Compressing files backup..."
        tar -czf "${FILES_BACKUP_DIR}.tar.gz" -C "$(dirname "$FILES_BACKUP_DIR")" "$(basename "$FILES_BACKUP_DIR")"
        rm -rf "$FILES_BACKUP_DIR"
        log_info "Files backup compressed: ${FILES_BACKUP_DIR}.tar.gz"
    fi

    log_info "Files backup completed successfully"
fi

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    local backup_type=$1
    local retention=$2
    local path="$BACKUP_DIR/$backup_type"

    if [ -d "$path" ]; then
        log_info "Cleaning up old $backup_type backups (keeping last $retention)..."

        # Clean database backups
        if [ -d "$path/database" ]; then
            find "$path/database" -type f -name "*.tar.gz" -o -type d -name "mongodb_*" | \
                sort -r | tail -n +$((retention + 1)) | xargs -r rm -rf
        fi

        # Clean files backups
        if [ -d "$path/files" ]; then
            find "$path/files" -type f -name "*.tar.gz" -o -type d -name "files_*" | \
                sort -r | tail -n +$((retention + 1)) | xargs -r rm -rf
        fi
    fi
}

log_info "Applying retention policy..."
cleanup_old_backups "daily" "$RETENTION_DAILY"
cleanup_old_backups "weekly" "$RETENTION_WEEKLY"
cleanup_old_backups "monthly" "$RETENTION_MONTHLY"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log_info "Total backup size: $BACKUP_SIZE"

log_info "===== AssetFlow Backup Completed Successfully ====="

exit 0
