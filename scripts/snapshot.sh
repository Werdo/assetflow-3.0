#!/bin/bash

##############################################################################
# AssetFlow Docker Container Snapshot System
# Creates snapshots of Docker containers and their volumes
##############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/snapshot.config.json"
LOG_FILE="/snapshots/snapshot.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    local level=$1
    shift
    local message="$@"
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "${GREEN}$@${NC}"; }
log_warn() { log "WARN" "${YELLOW}$@${NC}"; }
log_error() { log "ERROR" "${RED}$@${NC}"; }
log_debug() { log "DEBUG" "${BLUE}$@${NC}"; }

# Check config
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Read config
read_config() {
    jq -r "$1" "$CONFIG_FILE"
}

# Check if enabled
ENABLED=$(read_config '.enabled')
if [ "$ENABLED" != "true" ]; then
    log_info "Snapshot system is disabled"
    exit 0
fi

log_info "===== AssetFlow Container Snapshot Started ====="

# Get configuration
SNAPSHOT_DIR=$(read_config '.destination.path')
RETENTION_COUNT=$(read_config '.retention.count')
RETENTION_DAYS=$(read_config '.retention.maxAgeDays')
AUTO_CLEANUP=$(read_config '.autoCleanup')

# Create snapshot directory
mkdir -p "$SNAPSHOT_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to create container snapshot
snapshot_container() {
    local container_name=$1
    local include_volumes=$2
    local snapshot_name="${container_name}_${TIMESTAMP}"

    log_info "Creating snapshot for container: $container_name"

    # Check if container exists and is running
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "Container $container_name not found"
        return 1
    fi

    local container_status=$(docker inspect -f '{{.State.Running}}' "$container_name")
    log_debug "Container $container_name status: $container_status"

    # Export container filesystem
    log_info "Exporting container filesystem..."
    if docker export "$container_name" | gzip > "${SNAPSHOT_DIR}/${snapshot_name}.tar.gz"; then
        log_info "Container export successful: ${snapshot_name}.tar.gz"
    else
        log_error "Failed to export container $container_name"
        return 1
    fi

    # Backup volumes if enabled
    if [ "$include_volumes" == "true" ]; then
        log_info "Backing up volumes for $container_name..."

        # Get volume mounts
        local volumes=$(docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' "$container_name")

        if [ -n "$volumes" ]; then
            local volume_backup_dir="${SNAPSHOT_DIR}/${snapshot_name}_volumes"
            mkdir -p "$volume_backup_dir"

            for volume in $volumes; do
                log_info "Backing up volume: $volume"

                # Create temporary container to access volume
                docker run --rm \
                    -v "$volume:/volume:ro" \
                    -v "$volume_backup_dir:/backup" \
                    busybox \
                    tar czf "/backup/${volume}.tar.gz" -C /volume .

                if [ $? -eq 0 ]; then
                    log_info "Volume $volume backed up successfully"
                else
                    log_error "Failed to backup volume $volume"
                fi
            done
        else
            log_debug "No volumes found for container $container_name"
        fi
    fi

    # Save container metadata
    log_info "Saving container metadata..."
    docker inspect "$container_name" > "${SNAPSHOT_DIR}/${snapshot_name}_metadata.json"

    # Calculate snapshot size
    local snapshot_size=$(du -sh "${SNAPSHOT_DIR}/${snapshot_name}"* | awk '{s+=$1} END {print s}')
    log_info "Snapshot size: $snapshot_size"

    log_info "Snapshot completed for $container_name"
    return 0
}

# Process each container from config
log_info "Processing containers..."

container_count=$(jq '.containers | length' "$CONFIG_FILE")
success_count=0
failed_count=0

for i in $(seq 0 $((container_count - 1))); do
    container_name=$(jq -r ".containers[$i].name" "$CONFIG_FILE")
    container_enabled=$(jq -r ".containers[$i].enabled" "$CONFIG_FILE")
    include_volumes=$(jq -r ".containers[$i].includeVolumes" "$CONFIG_FILE")

    if [ "$container_enabled" == "true" ]; then
        if snapshot_container "$container_name" "$include_volumes"; then
            ((success_count++))
        else
            ((failed_count++))
        fi
    else
        log_info "Skipping disabled container: $container_name"
    fi
done

log_info "Snapshot summary: $success_count successful, $failed_count failed"

# Cleanup old snapshots
if [ "$AUTO_CLEANUP" == "true" ]; then
    log_info "Cleaning up old snapshots..."

    # Remove by count
    if [ "$RETENTION_COUNT" -gt 0 ]; then
        log_info "Keeping only last $RETENTION_COUNT snapshots per container"

        for container_name in $(jq -r '.containers[].name' "$CONFIG_FILE"); do
            find "$SNAPSHOT_DIR" -name "${container_name}_*.tar.gz" -type f | \
                sort -r | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm -f

            find "$SNAPSHOT_DIR" -name "${container_name}_*_volumes" -type d | \
                sort -r | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm -rf

            find "$SNAPSHOT_DIR" -name "${container_name}_*_metadata.json" -type f | \
                sort -r | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm -f
        done
    fi

    # Remove by age
    if [ "$RETENTION_DAYS" -gt 0 ]; then
        log_info "Removing snapshots older than $RETENTION_DAYS days"
        find "$SNAPSHOT_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
        find "$SNAPSHOT_DIR" -name "*_volumes" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
        find "$SNAPSHOT_DIR" -name "*_metadata.json" -type f -mtime +$RETENTION_DAYS -delete
    fi
fi

# Calculate total snapshot storage
TOTAL_SIZE=$(du -sh "$SNAPSHOT_DIR" | cut -f1)
SNAPSHOT_COUNT=$(find "$SNAPSHOT_DIR" -name "*.tar.gz" | wc -l)
log_info "Total snapshots: $SNAPSHOT_COUNT"
log_info "Total storage used: $TOTAL_SIZE"

log_info "===== AssetFlow Container Snapshot Completed ====="

exit 0
