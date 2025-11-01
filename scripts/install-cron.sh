#!/bin/bash

##############################################################################
# AssetFlow Cron Jobs Installation Script
# Installs and configures automated backup and snapshot services
##############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}===== AssetFlow Cron Jobs Installation =====${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root${NC}"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make scripts executable
echo "Making scripts executable..."
chmod +x "$SCRIPT_DIR/backup.sh"
chmod +x "$SCRIPT_DIR/snapshot.sh"

# Check for required commands
echo "Checking dependencies..."
for cmd in jq docker; do
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}Error: $cmd is required but not installed${NC}"
        exit 1
    fi
done

echo -e "${GREEN}All dependencies found${NC}"

# Create log directory
LOG_DIR="/var/log/assetflow"
sudo mkdir -p "$LOG_DIR"
sudo chmod 755 "$LOG_DIR"

# Backup existing crontab
CRON_BACKUP="/tmp/crontab_backup_$(date +%Y%m%d_%H%M%S)"
crontab -l > "$CRON_BACKUP" 2>/dev/null || true
echo "Existing crontab backed up to: $CRON_BACKUP"

# Read schedules from config files
BACKUP_SCHEDULE=$(jq -r '.schedule' "$SCRIPT_DIR/backup.config.json")
SNAPSHOT_SCHEDULE=$(jq -r '.schedule' "$SCRIPT_DIR/snapshot.config.json")

echo "Backup schedule: $BACKUP_SCHEDULE"
echo "Snapshot schedule: $SNAPSHOT_SCHEDULE"

# Create new crontab entries
TEMP_CRON=$(mktemp)

# Keep existing crontab (if any)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Remove old AssetFlow entries
sed -i '/# AssetFlow:/d' "$TEMP_CRON"
sed -i '/backup\.sh/d' "$TEMP_CRON"
sed -i '/snapshot\.sh/d' "$TEMP_CRON"

# Add new entries
cat >> "$TEMP_CRON" << EOF

# AssetFlow: Automated Database and Files Backup
$BACKUP_SCHEDULE $SCRIPT_DIR/backup.sh >> $LOG_DIR/backup.log 2>&1

# AssetFlow: Container Snapshots
$SNAPSHOT_SCHEDULE $SCRIPT_DIR/snapshot.sh >> $LOG_DIR/snapshot.log 2>&1

EOF

# Install new crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo -e "${GREEN}Cron jobs installed successfully!${NC}"
echo ""
echo "Installed jobs:"
echo "  - Backup:   $BACKUP_SCHEDULE"
echo "  - Snapshot: $SNAPSHOT_SCHEDULE"
echo ""
echo "Logs location: $LOG_DIR"
echo ""
echo "To view cron jobs: crontab -l"
echo "To test backup manually: sudo $SCRIPT_DIR/backup.sh"
echo "To test snapshot manually: sudo $SCRIPT_DIR/snapshot.sh"
echo ""
echo -e "${YELLOW}Note: Make sure Docker containers are running before testing${NC}"

exit 0
