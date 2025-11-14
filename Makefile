# Makefile for Oricol Helpdesk - Self-Hosted Supabase

.PHONY: help setup start stop restart logs status clean backup restore build dev

# Default target
help:
	@echo "Oricol Helpdesk - Self-Hosted Supabase Management"
	@echo "=================================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make setup      - Initial setup (create .env, generate keys, start services)"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all services"
	@echo "  make status     - Check status of all services"
	@echo "  make clean      - Stop and remove all containers and volumes (⚠️  DELETES DATA)"
	@echo "  make backup     - Create backup of database and storage"
	@echo "  make restore    - Restore from backup (requires BACKUP_NAME=...)"
	@echo "  make build      - Build the frontend application"
	@echo "  make dev        - Start frontend development server"
	@echo "  make prod       - Build and deploy production"
	@echo ""

# Initial setup
setup:
	@echo "🚀 Setting up Oricol Helpdesk..."
	@./scripts/setup.sh

# Start services
start:
	@echo "▶️  Starting services..."
	@docker compose up -d
	@echo "✅ Services started"

# Stop services
stop:
	@echo "⏸️  Stopping services..."
	@docker compose stop
	@echo "✅ Services stopped"

# Restart services
restart:
	@echo "🔄 Restarting services..."
	@docker compose restart
	@echo "✅ Services restarted"

# View logs
logs:
	@docker compose logs -f

# Check status
status:
	@docker compose ps

# Clean everything
clean:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "✅ Cleanup complete"; \
	else \
		echo "❌ Cleanup cancelled"; \
	fi

# Backup
backup:
	@./scripts/backup.sh

# Restore
restore:
ifndef BACKUP_NAME
	@echo "❌ Error: Please specify BACKUP_NAME"
	@echo "Usage: make restore BACKUP_NAME=oricol_backup_20250114_120000"
else
	@./scripts/restore.sh $(BACKUP_NAME)
endif

# Build frontend
build:
	@echo "🔨 Building frontend..."
	@npm run build
	@echo "✅ Build complete"

# Development mode
dev:
	@echo "🚀 Starting development server..."
	@npm run dev

# Production deployment
prod: build
	@echo "🚀 Deploying to production..."
	@docker compose restart
	@echo "✅ Deployment complete"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"

# Run linter
lint:
	@echo "🔍 Running linter..."
	@npm run lint

# Generate secure keys
keys:
	@./scripts/generate-keys.sh

# Update services to latest versions
update:
	@echo "⬆️  Updating Docker images..."
	@docker compose pull
	@echo "✅ Update complete. Run 'make restart' to apply changes."

# Database migrations
migrate:
	@echo "🔄 Running database migrations..."
	@docker compose exec -T postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/
	@echo "✅ Migrations complete"

# Open Supabase Studio
studio:
	@echo "🎨 Opening Supabase Studio..."
	@xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || echo "Open http://localhost:3000 in your browser"

# Open application
app:
	@echo "🌐 Opening application..."
	@xdg-open http://localhost:8080 2>/dev/null || open http://localhost:8080 2>/dev/null || echo "Open http://localhost:8080 in your browser"
