#!/bin/bash

# Setup script for Oricol Helpdesk Self-Hosted Supabase
# This script initializes the self-hosted Supabase environment

set -e

echo "🚀 Oricol Helpdesk - Self-Hosted Supabase Setup"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please update Docker to the latest version."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and update the following:"
    echo "   - POSTGRES_PASSWORD (database password)"
    echo "   - JWT_SECRET (JWT signing key)"
    echo "   - DASHBOARD_PASSWORD (admin dashboard password)"
    echo ""
    echo "💡 TIP: Run './scripts/generate-keys.sh' to generate secure random keys"
    echo ""
    read -p "Press Enter to continue after updating .env file..."
else
    echo "✅ .env file exists"
fi

echo ""
echo "🐳 Starting Supabase services with Docker Compose..."
echo ""

# Pull latest images
docker compose pull

# Start services
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Supabase is running!"
    echo ""
    echo "📊 Access Points:"
    echo "   - Supabase Studio (Database UI): http://localhost:3000"
    echo "   - API Gateway:                   http://localhost:8000"
    echo "   - PostgreSQL:                    localhost:5432"
    echo "   - Mail UI (Inbucket):            http://localhost:9000"
    echo ""
    echo "🔑 Default Credentials:"
    echo "   - Studio Username: supabase (or check DASHBOARD_USERNAME in .env)"
    echo "   - Studio Password: Check DASHBOARD_PASSWORD in .env"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Update your frontend .env file:"
    echo "      VITE_SUPABASE_URL=http://localhost:8000"
    echo "      VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from .env>"
    echo ""
    echo "   2. Start the frontend:"
    echo "      npm run dev"
    echo ""
    echo "   3. Access the app at:"
    echo "      http://localhost:8080"
    echo ""
    echo "💡 Management Commands:"
    echo "   - Stop:    docker compose stop"
    echo "   - Restart: docker compose restart"
    echo "   - Logs:    docker compose logs -f"
    echo "   - Status:  docker compose ps"
    echo ""
else
    echo ""
    echo "⚠️  Some services may not be running. Check logs with:"
    echo "   docker compose logs -f"
    echo ""
fi
