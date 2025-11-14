#!/bin/bash

# Backup script for Supabase database and storage
# This script creates a timestamped backup of the database and storage files

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="oricol_backup_${TIMESTAMP}"

echo "💾 Creating backup: $BACKUP_NAME"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
echo "📦 Backing up PostgreSQL database..."
docker compose exec -T postgres pg_dump -U postgres postgres > "$BACKUP_DIR/${BACKUP_NAME}.sql"

# Backup storage files
echo "📦 Backing up storage files..."
docker compose exec -T storage tar czf - /var/lib/storage > "$BACKUP_DIR/${BACKUP_NAME}_storage.tar.gz"

echo ""
echo "✅ Backup completed successfully!"
echo ""
echo "📁 Backup files:"
echo "   - Database: $BACKUP_DIR/${BACKUP_NAME}.sql"
echo "   - Storage:  $BACKUP_DIR/${BACKUP_NAME}_storage.tar.gz"
echo ""
echo "💡 To restore from this backup, run:"
echo "   ./scripts/restore.sh $BACKUP_NAME"
echo ""
