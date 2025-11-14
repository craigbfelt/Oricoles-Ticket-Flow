#!/bin/bash

# Oricol Helpdesk - Comprehensive Local Setup Automation
# This script automates the complete setup process for running the app locally

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Functions for colored output
print_header() {
    echo ""
    echo -e "${BOLD}${MAGENTA}=========================================="
    echo -e "$1"
    echo -e "==========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS="Linux";;
        Darwin*)    OS="macOS";;
        CYGWIN*)    OS="Windows";;
        MINGW*)     OS="Windows";;
        MSYS*)      OS="Windows";;
        *)          OS="Unknown";;
    esac
    echo "$OS"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check port availability
check_port() {
    local port=$1
    if command_exists lsof; then
        if lsof -i :$port >/dev/null 2>&1; then
            return 1
        fi
    elif command_exists netstat; then
        if netstat -an | grep -q ":$port.*LISTEN"; then
            return 1
        fi
    fi
    return 0
}

# Kill process on port
kill_port() {
    local port=$1
    print_warning "Attempting to free port $port..."
    if command_exists lsof; then
        local pid=$(lsof -t -i:$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            print_success "Freed port $port"
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    local has_errors=0
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_success "Node.js $node_version found"
        
        # Check if version is 18+
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required (found v$major_version)"
            has_errors=1
        fi
    else
        print_error "Node.js is not installed"
        print_info "Install from: https://nodejs.org/"
        has_errors=1
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm $npm_version found"
    else
        print_error "npm is not installed"
        has_errors=1
    fi
    
    # Check Docker (optional for some setups)
    if command_exists docker; then
        print_success "Docker found"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            print_success "Docker daemon is running"
        else
            print_warning "Docker is installed but daemon is not running"
            print_info "Please start Docker Desktop (no account/login required)"
        fi
    else
        print_warning "Docker is not installed (required for Docker setup options)"
        print_info "Download FREE from: https://www.docker.com/products/docker-desktop"
        print_info "NOTE: Docker Desktop is 100% FREE for local development"
        print_info "      No account, profile, or payment needed!"
    fi
    
    # Check Git
    if command_exists git; then
        print_success "Git found"
    else
        print_warning "Git is not installed"
    fi
    
    echo ""
    
    if [ $has_errors -eq 1 ]; then
        print_error "Please install missing prerequisites and try again"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing Node.js dependencies..."
    
    if [ -d "node_modules" ]; then
        print_info "node_modules already exists"
        read -p "Reinstall dependencies? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_success "Using existing dependencies"
            return
        fi
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed"
}

# Setup environment file
setup_env_file() {
    local env_type=$1
    
    if [ "$env_type" = "docker" ]; then
        print_step "Setting up environment for Docker Compose..."
        
        if [ ! -f ".env" ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            print_warning "Please review .env and update the following:"
            echo "  - POSTGRES_PASSWORD (use a strong password)"
            echo "  - JWT_SECRET (at least 32 characters)"
            echo "  - DASHBOARD_PASSWORD (change default password)"
            echo ""
            read -p "Press Enter after updating .env, or press Ctrl+C to exit and update later..."
        else
            print_info ".env already exists"
        fi
        
    elif [ "$env_type" = "local-supabase" ]; then
        print_step "Setting up environment for local Supabase..."
        
        # Check if Supabase is running
        if docker ps 2>/dev/null | grep -q "supabase"; then
            print_success "Supabase is already running"
        else
            print_info "Starting Supabase (this may take a few minutes on first run)..."
            npx supabase start
        fi
        
        # Get Supabase credentials
        print_step "Getting Supabase credentials..."
        local anon_key=$(npx supabase status 2>/dev/null | grep "anon key:" | awk '{print $3}')
        
        if [ -z "$anon_key" ]; then
            print_error "Could not get anon key from Supabase"
            print_warning "Please run: npx supabase status"
            return 1
        fi
        
        # Create .env.local
        cat > .env.local << EOF
# Local Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=$anon_key
EOF
        
        print_success "Created .env.local with local Supabase configuration"
        
    elif [ "$env_type" = "cloud" ]; then
        print_step "Using cloud Supabase configuration from .env..."
        
        if [ ! -f ".env" ]; then
            print_error ".env file not found"
            print_info "Please create .env with your Supabase credentials"
            return 1
        fi
        
        print_success "Using existing .env configuration"
    fi
}

# Docker Compose setup
setup_docker_compose() {
    print_header "🐳 Docker Compose Setup"
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed"
        print_info "Download FREE from: https://www.docker.com/products/docker-desktop"
        print_info "NOTE: Docker Desktop is 100% FREE for local development"
        print_info "      No account, profile, or payment needed!"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker Desktop and try again"
        print_info "If prompted to login, you can skip it - no account needed!"
        exit 1
    fi
    
    # Setup environment
    setup_env_file "docker"
    
    # Check ports
    print_step "Checking port availability..."
    local ports=(5432 3000 8000 8443 9000 2500)
    local ports_in_use=()
    
    for port in "${ports[@]}"; do
        if ! check_port $port; then
            ports_in_use+=($port)
            print_warning "Port $port is in use"
        fi
    done
    
    if [ ${#ports_in_use[@]} -gt 0 ]; then
        echo ""
        print_warning "The following ports are in use: ${ports_in_use[*]}"
        read -p "Try to free these ports? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for port in "${ports_in_use[@]}"; do
                kill_port $port
            done
        else
            print_info "You may need to stop conflicting services manually"
        fi
    fi
    
    # Start Docker Compose
    print_step "Starting Docker Compose services..."
    echo ""
    
    read -p "Start in background (detached mode)? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Starting in foreground mode (press Ctrl+C to stop)..."
        docker-compose up --build
    else
        print_info "Starting in background mode..."
        docker-compose up -d --build
        
        echo ""
        print_step "Waiting for services to be healthy..."
        sleep 10
        
        # Check service status
        docker-compose ps
        
        echo ""
        print_success "Services started successfully!"
        
        echo ""
        print_header "🎉 Setup Complete!"
        print_info "Access the application at:"
        echo ""
        echo "  📱 Frontend App:       http://localhost:8080"
        echo "  🎨 Supabase Studio:    http://localhost:3000"
        echo "  🔌 API Gateway:        http://localhost:8000"
        echo "  📧 Mail Server (UI):   http://localhost:9000"
        echo ""
        print_info "Useful commands:"
        echo "  View logs:        docker-compose logs -f"
        echo "  Stop services:    docker-compose down"
        echo "  Restart:          docker-compose restart"
        echo "  Check status:     docker-compose ps"
        echo ""
    fi
}

# Local Supabase setup
setup_local_supabase() {
    print_header "🗄️ Local Supabase Setup"
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env_file "local-supabase"
    
    # Build frontend (optional)
    read -p "Build frontend now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Building frontend..."
        npm run build
        print_success "Build complete"
    fi
    
    echo ""
    print_header "🎉 Setup Complete!"
    print_info "Supabase URLs:"
    echo ""
    echo "  🔌 API:             http://localhost:54321"
    echo "  🎨 Studio:          http://localhost:54323"
    echo "  📧 Inbucket:        http://localhost:54324"
    echo "  🗄️ PostgreSQL:      postgresql://postgres:postgres@localhost:54322/postgres"
    echo ""
    print_info "To start the development server:"
    echo "  npm run dev"
    echo ""
    print_info "Useful commands:"
    echo "  Stop Supabase:     npx supabase stop"
    echo "  View status:       npx supabase status"
    echo "  View logs:         npx supabase logs -f"
    echo "  Reset database:    npx supabase db reset"
    echo ""
}

# Native Node.js setup
setup_native_node() {
    print_header "🚀 Native Node.js Setup"
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    print_step "Configuring environment..."
    
    if [ -f ".env" ]; then
        print_success "Using existing .env configuration"
    else
        print_warning "No .env file found"
        echo ""
        echo "You need to configure your Supabase connection."
        echo "Options:"
        echo "  1. Use cloud Supabase (supabase.com)"
        echo "  2. Run local PostgreSQL with Docker"
        echo "  3. Use existing PostgreSQL instance"
        echo ""
        read -p "Enter your choice (1-3): " choice
        
        case $choice in
            1)
                setup_env_file "cloud"
                ;;
            2)
                print_step "Starting PostgreSQL with Docker..."
                docker run --name oricol-db \
                    -e POSTGRES_PASSWORD=postgres \
                    -e POSTGRES_DB=oricol \
                    -p 5432:5432 \
                    -d postgres:15
                
                print_success "PostgreSQL started"
                print_info "Database URL: postgresql://postgres:postgres@localhost:5432/oricol"
                
                # Create basic .env
                cat > .env << EOF
VITE_SUPABASE_URL=http://localhost:3001
VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oricol
EOF
                print_warning "Please update .env with your Supabase credentials"
                ;;
            3)
                print_info "Please create .env manually with your PostgreSQL connection string"
                ;;
        esac
    fi
    
    echo ""
    print_header "🎉 Setup Complete!"
    print_info "To start the development server:"
    echo "  npm run dev"
    echo ""
}

# Main menu
show_menu() {
    print_header "🎫 Oricol Helpdesk - Local Setup Automation"
    
    local os=$(detect_os)
    print_info "Detected OS: $os"
    echo ""
    
    print_info "💡 Docker Desktop is FREE for local development (no account needed!)"
    echo ""
    
    echo "Choose your setup method:"
    echo ""
    echo "  ${BOLD}1)${NC} Docker Compose (Recommended - FREE, no Docker account needed)"
    echo "     ✓ Complete stack with PostgreSQL, Supabase, and all services"
    echo "     ✓ Production-like environment"
    echo "     ✓ Requires: Docker Desktop (100% free, no login required)"
    echo ""
    echo "  ${BOLD}2)${NC} Local Supabase CLI (FREE, no Docker account needed)"
    echo "     ✓ Lightweight development setup"
    echo "     ✓ Full Supabase features"
    echo "     ✓ Requires: Docker (for Supabase containers, no login needed)"
    echo ""
    echo "  ${BOLD}3)${NC} Native Node.js (No Docker at all)"
    echo "     ✓ Minimal setup"
    echo "     ✓ Uses free cloud Supabase or local PostgreSQL"
    echo "     ✓ Requires: Node.js only (+ optional PostgreSQL)"
    echo ""
    echo "  ${BOLD}4)${NC} Check prerequisites only"
    echo ""
    echo "  ${BOLD}5)${NC} Exit"
    echo ""
}

# Main execution
main() {
    clear
    
    show_menu
    
    read -p "Enter your choice (1-5): " choice
    echo ""
    
    case $choice in
        1)
            check_prerequisites
            setup_docker_compose
            ;;
        2)
            check_prerequisites
            setup_local_supabase
            ;;
        3)
            check_prerequisites
            setup_native_node
            ;;
        4)
            check_prerequisites
            echo ""
            print_success "Prerequisites check complete"
            ;;
        5)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Run main
main
