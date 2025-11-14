#!/bin/bash

# Oricol Helpdesk - Quick Start Script for Local Development
# This script helps you get the app running locally quickly

set -e  # Exit on error

echo "=========================================="
echo "🎫 Oricol Helpdesk - Quick Start"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Node.js is installed
print_step "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version) found"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed"
    echo "Docker is required for local Supabase. Please install from: https://www.docker.com/products/docker-desktop"
    echo ""
    read -p "Continue without Docker? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
print_step "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

echo ""
print_step "Checking Supabase configuration..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    print_success "Local environment file (.env.local) exists"
    echo ""
    echo "Using existing .env.local configuration"
else
    print_warning "No .env.local file found"
    echo ""
    echo "Choose your setup option:"
    echo "  1) Use local Supabase (recommended for development)"
    echo "  2) Use cloud Supabase (existing .env configuration)"
    echo ""
    read -p "Enter your choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        print_step "Setting up local Supabase..."
        
        # Check if Supabase CLI is available
        if ! command -v supabase &> /dev/null; then
            print_warning "Supabase CLI not found, using npx..."
        fi
        
        # Check if Supabase is already running
        if docker ps | grep -q "supabase"; then
            print_success "Supabase is already running"
        else
            echo "Starting Supabase (this may take a few minutes on first run)..."
            npx supabase start
        fi
        
        # Get the anon key from Supabase status
        echo ""
        print_step "Getting Supabase credentials..."
        ANON_KEY=$(npx supabase status | grep "anon key:" | awk '{print $3}')
        
        if [ -z "$ANON_KEY" ]; then
            print_error "Could not get anon key from Supabase"
            print_warning "Please create .env.local manually"
            exit 1
        fi
        
        # Create .env.local
        cat > .env.local << EOF
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF
        
        print_success "Created .env.local with local Supabase configuration"
        
        echo ""
        echo "=========================================="
        echo "Supabase URLs:"
        echo "  API: http://localhost:54321"
        echo "  Studio: http://localhost:54323"
        echo "  Inbucket (emails): http://localhost:54324"
        echo "=========================================="
        
    else
        print_success "Using cloud Supabase from .env file"
    fi
fi

echo ""
print_step "Starting development server..."
echo ""
echo "=========================================="
echo "🚀 Application will be available at:"
echo "   http://localhost:8080"
echo "=========================================="
echo ""
echo "Useful URLs:"
echo "  📱 App:              http://localhost:8080"
if [ -f ".env.local" ]; then
    if grep -q "localhost:54321" .env.local 2>/dev/null; then
        echo "  🎨 Supabase Studio:  http://localhost:54323"
        echo "  📧 Email Testing:    http://localhost:54324"
    fi
fi
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Start the development server
npm run dev
