#!/bin/bash

# Supabase Migration Helper Script
# This script helps you manage Supabase migrations between GitHub and Lovable

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
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

# Check if Supabase CLI is installed
check_supabase_cli() {
    if command -v supabase &> /dev/null; then
        print_success "Supabase CLI is installed"
        supabase --version
        return 0
    else
        print_warning "Supabase CLI is not installed globally"
        return 1
    fi
}

# Install Supabase CLI
install_supabase_cli() {
    print_info "Installing Supabase CLI..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS or Linux
        if command -v brew &> /dev/null; then
            print_info "Installing via Homebrew..."
            brew install supabase/tap/supabase
        else
            print_info "Installing via npm..."
            npm install -g supabase
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        print_info "Installing via npm..."
        npm install -g supabase
    else
        print_warning "Unknown OS, trying npm installation..."
        npm install -g supabase
    fi
    
    print_success "Supabase CLI installed successfully!"
}

# Show usage information
show_usage() {
    cat << EOF

${GREEN}Supabase Migration Helper${NC}

This script helps you manage Supabase SQL migrations when syncing between GitHub and Lovable.

${BLUE}Usage:${NC}
  $0 [command] [options]

${BLUE}Commands:${NC}
  install         Install Supabase CLI
  status          Check migration status
  apply           Apply migrations to remote Supabase project
  local           Apply migrations to local Supabase instance
  new [name]      Create a new migration file
  reset           Reset local database (WARNING: destructive)
  link            Link to your Supabase project
  help            Show this help message

${BLUE}Examples:${NC}
  $0 install              # Install Supabase CLI
  $0 status               # Check what migrations need to be applied
  $0 apply                # Apply all pending migrations to remote
  $0 local                # Apply all migrations to local Supabase
  $0 new add_users_table  # Create a new migration file

${BLUE}Quick Start:${NC}
  1. Run: $0 install
  2. Run: $0 link
  3. Run: $0 apply

${BLUE}For more information:${NC}
  See SUPABASE_MIGRATIONS.md in the project root

EOF
}

# Link to Supabase project
link_project() {
    print_info "Linking to Supabase project..."
    
    if [ -f "supabase/config.toml" ]; then
        PROJECT_ID=$(grep -m 1 'project_id' supabase/config.toml | cut -d '"' -f 2)
        if [ -n "$PROJECT_ID" ]; then
            print_info "Found project ID: $PROJECT_ID"
            print_info "Attempting to link..."
            npx supabase link --project-ref "$PROJECT_ID"
            print_success "Project linked successfully!"
        else
            print_warning "Could not find project ID in supabase/config.toml"
            print_info "Please run manually: npx supabase link --project-ref YOUR_PROJECT_REF"
        fi
    else
        print_warning "supabase/config.toml not found"
        print_info "Please run: npx supabase link --project-ref YOUR_PROJECT_REF"
    fi
}

# Check migration status
check_status() {
    print_info "Checking migration status..."
    
    if ! check_supabase_cli; then
        print_error "Please install Supabase CLI first: $0 install"
        exit 1
    fi
    
    npx supabase migration list
}

# Apply migrations to remote
apply_migrations() {
    print_info "Applying migrations to remote Supabase project..."
    
    if ! check_supabase_cli; then
        print_error "Please install Supabase CLI first: $0 install"
        exit 1
    fi
    
    print_info "This will apply all pending migrations from supabase/migrations/"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx supabase db push
        print_success "Migrations applied successfully!"
    else
        print_warning "Migration cancelled"
    fi
}

# Apply migrations locally
apply_local() {
    print_info "Starting local Supabase and applying migrations..."
    
    if ! check_supabase_cli; then
        print_error "Please install Supabase CLI first: $0 install"
        exit 1
    fi
    
    print_info "This will start a local Supabase instance using Docker"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        print_info "Download from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    npx supabase start
    print_success "Local Supabase is running!"
    print_info "Supabase Studio: http://localhost:54323"
}

# Create new migration
create_migration() {
    if [ -z "$1" ]; then
        print_error "Please provide a migration name"
        print_info "Example: $0 new add_users_table"
        exit 1
    fi
    
    print_info "Creating new migration: $1"
    
    if ! check_supabase_cli; then
        print_error "Please install Supabase CLI first: $0 install"
        exit 1
    fi
    
    npx supabase migration new "$1"
    print_success "Migration file created in supabase/migrations/"
}

# Reset local database
reset_local() {
    print_warning "This will DESTROY all local data and reset the database!"
    read -p "Are you sure? (yes/no) " -r
    echo
    
    if [[ $REPLY == "yes" ]]; then
        print_info "Resetting local database..."
        npx supabase db reset
        print_success "Database reset complete!"
    else
        print_warning "Reset cancelled"
    fi
}

# Main script logic
main() {
    case "${1:-help}" in
        install)
            if check_supabase_cli; then
                print_info "Supabase CLI is already installed"
            else
                install_supabase_cli
            fi
            ;;
        status)
            check_status
            ;;
        apply)
            apply_migrations
            ;;
        local)
            apply_local
            ;;
        new)
            create_migration "$2"
            ;;
        reset)
            reset_local
            ;;
        link)
            link_project
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
