#!/bin/bash

# Restore script for Supabase database and storage
# Usage: ./restore.sh <backup_name>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_name>"
    echo ""
    echo "Available backups:"
    ls -1 ./backups/*.sql 2>/dev/null | sed 's/.sql$//' | xargs -n1 basename || echo "  No backups found"
    exit 1
fi

BACKUP_DIR="./backups"
BACKUP_NAME="$1"

if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}.sql" ]; then
    echo "❌ Backup not found: $BACKUP_DIR/${BACKUP_NAME}.sql"
    exit 1
fi

echo "⚠️  WARNING: This will replace all current data!"
echo ""
read -p "Are you sure you want to restore from $BACKUP_NAME? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Restore PostgreSQL database
echo "📥 Restoring PostgreSQL database..."
docker compose exec -T postgres psql -U postgres postgres < "$BACKUP_DIR/${BACKUP_NAME}.sql"

# Restore storage files if they exist
if [ -f "$BACKUP_DIR/${BACKUP_NAME}_storage.tar.gz" ]; then
    echo "📥 Restoring storage files..."
    docker compose exec -T storage tar xzf - -C / < "$BACKUP_DIR/${BACKUP_NAME}_storage.tar.gz"
fi

echo ""
echo "✅ Restore completed successfully!"
echo ""
echo "🔄 Restarting services..."
docker compose restart

echo ""
echo "✅ All done! Your data has been restored."
echo ""
