# Makefile for Oricol Helpdesk - Self-Hosted Supabase

.PHONY: help setup start stop restart logs status clean backup restore build dev install prereqs

# Default target
help:
	@echo "Oricol Helpdesk - Self-Hosted Supabase Management"
	@echo "=================================================="
	@echo ""
	@echo "🚀 Quick Start Commands:"
	@echo "  make setup-interactive  - Interactive setup wizard (recommended for first time)"
	@echo "  make setup-docker       - Automated Docker Compose setup"
	@echo "  make setup-local        - Automated local Supabase setup"
	@echo "  make prereqs            - Check all prerequisites"
	@echo ""
	@echo "📦 Service Management:"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all services"
	@echo "  make status     - Check status of all services"
	@echo ""
	@echo "💻 Development:"
	@echo "  make dev        - Start frontend development server"
	@echo "  make build      - Build the frontend application"
	@echo "  make install    - Install Node.js dependencies"
	@echo "  make lint       - Run linter"
	@echo ""
	@echo "🗄️ Database & Backup:"
	@echo "  make backup     - Create backup of database and storage"
	@echo "  make restore    - Restore from backup (requires BACKUP_NAME=...)"
	@echo "  make migrate    - Run database migrations"
	@echo ""
	@echo "🔧 Utilities:"
	@echo "  make clean      - Stop and remove all containers and volumes (⚠️  DELETES DATA)"
	@echo "  make keys       - Generate secure keys for production"
	@echo "  make update     - Update Docker images to latest versions"
	@echo "  make studio     - Open Supabase Studio in browser"
	@echo "  make app        - Open application in browser"
	@echo ""

# Interactive setup wizard
setup-interactive:
	@echo "🎯 Starting interactive setup wizard..."
	@chmod +x setup-local.sh
	@./setup-local.sh

# Automated Docker Compose setup
setup-docker:
	@echo "🐳 Setting up with Docker Compose..."
	@echo "Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is not installed. Install from https://docker.com"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "❌ Docker daemon is not running. Please start Docker Desktop"; exit 1; }
	@echo "✅ Docker is ready"
	@if [ ! -f ".env" ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "✅ Created .env"; \
		echo "⚠️  Please review and update .env with your credentials"; \
	fi
	@echo "Starting Docker Compose services..."
	@docker-compose up -d --build
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Access your application:"
	@echo "  📱 App:              http://localhost:8080"
	@echo "  🎨 Supabase Studio:  http://localhost:3000"
	@echo "  🔌 API Gateway:      http://localhost:8000"
	@echo "  📧 Mail Server:      http://localhost:9000"

# Automated local Supabase setup
setup-local:
	@echo "🗄️ Setting up with local Supabase..."
	@echo "Checking prerequisites..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed. Install from https://nodejs.org"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm is not installed"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is not installed (required for Supabase). Install from https://docker.com"; exit 1; }
	@echo "✅ Prerequisites satisfied"
	@echo "Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"
	@echo "Starting Supabase..."
	@npx supabase start
	@echo "Creating .env.local..."
	@ANON_KEY=$$(npx supabase status | grep "anon key:" | awk '{print $$3}'); \
	echo "VITE_SUPABASE_URL=http://localhost:54321" > .env.local; \
	echo "VITE_SUPABASE_PUBLISHABLE_KEY=$$ANON_KEY" >> .env.local
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Supabase is running:"
	@echo "  🔌 API:        http://localhost:54321"
	@echo "  🎨 Studio:     http://localhost:54323"
	@echo "  📧 Inbucket:   http://localhost:54324"
	@echo ""
	@echo "Start development server with: make dev"

# Check prerequisites
prereqs:
	@echo "Checking prerequisites..."
	@echo ""
	@command -v node >/dev/null 2>&1 && echo "✅ Node.js: $$(node --version)" || echo "❌ Node.js is not installed"
	@command -v npm >/dev/null 2>&1 && echo "✅ npm: $$(npm --version)" || echo "❌ npm is not installed"
	@command -v docker >/dev/null 2>&1 && echo "✅ Docker: $$(docker --version)" || echo "❌ Docker is not installed"
	@docker info >/dev/null 2>&1 && echo "✅ Docker daemon is running" || echo "⚠️  Docker daemon is not running"
	@command -v git >/dev/null 2>&1 && echo "✅ Git: $$(git --version)" || echo "⚠️  Git is not installed"
	@echo ""
	@echo "System Info:"
	@echo "  OS: $$(uname -s)"
	@echo "  Architecture: $$(uname -m)"

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
