#!/bin/bash

# Oricol Helpdesk - Troubleshooting and Diagnostic Tool
# This script helps diagnose and fix common issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}=========================================="
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check port
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

# Get process using port
get_port_process() {
    local port=$1
    if command_exists lsof; then
        lsof -i :$port 2>/dev/null || echo "No process found"
    else
        echo "lsof not available"
    fi
}

# Main diagnostic
run_diagnostics() {
    print_header "🔍 Oricol Helpdesk - System Diagnostics"
    
    # 1. Check prerequisites
    print_step "1. Checking Prerequisites..."
    echo ""
    
    local issues=0
    
    # Node.js
    if command_exists node; then
        local node_version=$(node --version | cut -d'v' -f2)
        local major=$(echo $node_version | cut -d'.' -f1)
        if [ "$major" -ge 18 ]; then
            print_success "Node.js v$node_version (✓ version 18+)"
        else
            print_error "Node.js v$node_version (need 18+)"
            issues=$((issues + 1))
        fi
    else
        print_error "Node.js not installed"
        print_info "Install from: https://nodejs.org/"
        issues=$((issues + 1))
    fi
    
    # npm
    if command_exists npm; then
        print_success "npm $(npm --version)"
    else
        print_error "npm not installed"
        issues=$((issues + 1))
    fi
    
    # Docker
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') (daemon running)"
        else
            print_warning "Docker installed but daemon not running"
            print_info "Start Docker Desktop"
            issues=$((issues + 1))
        fi
    else
        print_warning "Docker not installed (optional for some setups)"
    fi
    
    echo ""
    
    # 2. Check files
    print_step "2. Checking Project Files..."
    echo ""
    
    local required_files=("package.json" "vite.config.ts" "tsconfig.json" ".env.example")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file exists"
        else
            print_error "$file missing"
            issues=$((issues + 1))
        fi
    done
    
    echo ""
    
    # 3. Check environment
    print_step "3. Checking Environment Configuration..."
    echo ""
    
    if [ -f ".env" ]; then
        print_success ".env exists"
        
        # Check for sensitive values
        if grep -q "your-super-secret" .env 2>/dev/null; then
            print_warning ".env contains default values - should be updated for production"
        fi
    else
        print_info ".env not found (will use .env.local or defaults)"
    fi
    
    if [ -f ".env.local" ]; then
        print_success ".env.local exists"
        
        # Check Supabase URL
        if grep -q "VITE_SUPABASE_URL" .env.local; then
            local url=$(grep VITE_SUPABASE_URL .env.local | cut -d'=' -f2)
            print_info "Supabase URL: $url"
        fi
    else
        print_info ".env.local not found (optional)"
    fi
    
    echo ""
    
    # 4. Check dependencies
    print_step "4. Checking Dependencies..."
    echo ""
    
    if [ -d "node_modules" ]; then
        print_success "node_modules exists"
        
        # Check size
        local size=$(du -sh node_modules 2>/dev/null | cut -f1)
        print_info "Size: $size"
    else
        print_warning "node_modules not found"
        print_info "Run: npm install"
        issues=$((issues + 1))
    fi
    
    echo ""
    
    # 5. Check ports
    print_step "5. Checking Port Availability..."
    echo ""
    
    local ports=(8080 5432 3000 8000 54321 54323)
    local port_names=("App" "PostgreSQL" "Studio" "Kong" "Supabase API" "Supabase Studio")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}
        
        if check_port $port; then
            print_success "Port $port ($name) is available"
        else
            print_warning "Port $port ($name) is in use"
            echo "  Process: $(get_port_process $port | head -1)"
        fi
    done
    
    echo ""
    
    # 6. Check Docker services
    if command_exists docker && docker info >/dev/null 2>&1; then
        print_step "6. Checking Docker Services..."
        echo ""
        
        if docker-compose ps >/dev/null 2>&1; then
            local running=$(docker-compose ps --filter "status=running" -q | wc -l)
            if [ $running -gt 0 ]; then
                print_success "$running Docker Compose services running"
                docker-compose ps
            else
                print_info "No Docker Compose services running"
            fi
        else
            print_info "Docker Compose not running"
        fi
        
        # Check for Supabase containers
        local supabase_containers=$(docker ps --filter "name=supabase" --format '{{.Names}}' | wc -l)
        if [ $supabase_containers -gt 0 ]; then
            print_success "$supabase_containers Supabase containers running"
        else
            print_info "No Supabase containers running"
        fi
        
        echo ""
    fi
    
    # 7. Summary
    print_header "📊 Diagnostic Summary"
    
    if [ $issues -eq 0 ]; then
        print_success "No critical issues found!"
        echo ""
        print_info "Your system appears to be ready for development."
    else
        print_warning "Found $issues issue(s) that need attention"
        echo ""
        print_info "Please resolve the issues marked with ✗ above"
    fi
    
    echo ""
}

# Quick fixes menu
show_fixes() {
    print_header "🔧 Quick Fixes"
    
    echo "Select a fix to apply:"
    echo ""
    echo "  1) Install dependencies (npm install)"
    echo "  2) Create .env from .env.example"
    echo "  3) Free ports (kill processes on common ports)"
    echo "  4) Clean and reinstall node_modules"
    echo "  5) Stop all Docker containers"
    echo "  6) Reset local Supabase"
    echo "  7) Clear npm cache"
    echo "  8) Return to diagnostics"
    echo "  9) Exit"
    echo ""
    
    read -p "Enter your choice (1-9): " choice
    
    case $choice in
        1)
            print_step "Installing dependencies..."
            npm install
            print_success "Dependencies installed"
            ;;
        2)
            if [ -f ".env.example" ]; then
                cp .env.example .env
                print_success "Created .env from .env.example"
                print_warning "Please update .env with your credentials"
            else
                print_error ".env.example not found"
            fi
            ;;
        3)
            print_step "Freeing ports..."
            for port in 8080 5432 3000 8000; do
                if command_exists lsof; then
                    local pid=$(lsof -t -i:$port 2>/dev/null)
                    if [ ! -z "$pid" ]; then
                        kill -9 $pid 2>/dev/null && print_success "Freed port $port" || print_warning "Could not free port $port"
                    fi
                fi
            done
            ;;
        4)
            print_step "Cleaning and reinstalling..."
            rm -rf node_modules package-lock.json
            npm install
            print_success "Clean install complete"
            ;;
        5)
            print_step "Stopping all Docker containers..."
            docker stop $(docker ps -aq) 2>/dev/null || print_info "No containers to stop"
            print_success "All containers stopped"
            ;;
        6)
            if command_exists npx; then
                print_step "Resetting local Supabase..."
                npx supabase stop
                npx supabase start
                print_success "Supabase reset complete"
            else
                print_error "npx not available"
            fi
            ;;
        7)
            print_step "Clearing npm cache..."
            npm cache clean --force
            print_success "Cache cleared"
            ;;
        8)
            run_diagnostics
            return
            ;;
        9)
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    show_fixes
}

# Main menu
main() {
    clear
    print_header "🔍 Oricol Helpdesk - Troubleshooting Tool"
    
    echo "What would you like to do?"
    echo ""
    echo "  1) Run diagnostics"
    echo "  2) Quick fixes"
    echo "  3) Both (diagnostics then fixes)"
    echo "  4) Exit"
    echo ""
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            run_diagnostics
            ;;
        2)
            show_fixes
            ;;
        3)
            run_diagnostics
            echo ""
            read -p "Press Enter to continue to quick fixes..."
            show_fixes
            ;;
        4)
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Run
main
