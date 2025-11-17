#!/bin/bash

# Database Detection and Diagnostic Tool
# This script implements all 8 steps from the database detection checklist

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}\n"
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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Step 1: Quick check - Lovable admin UI / SQL Editor
step_1_admin_ui_check() {
    print_header "Step 1: Admin UI / SQL Editor Check"
    
    print_info "Manual steps to check in Lovable admin UI:"
    echo "  1. Open Lovable as an admin"
    echo "  2. Look for: Settings / Admin / Database / Connection or Integrations"
    echo "  3. Check for SQL Editor saved scripts or 'Saved Queries'"
    echo ""
    print_warning "This is a manual step - please perform these checks in your Lovable UI"
    echo ""
}

# Step 2: Read-only DB query detection
step_2_detection_queries() {
    print_header "Step 2: Read-only Database Detection Queries"
    
    echo "Run these queries in your SQL Editor to detect the database engine:"
    echo ""
    
    echo -e "${GREEN}PostgreSQL:${NC}"
    echo "  SELECT version();"
    echo "  SELECT current_database(), current_user;"
    echo "  SELECT inet_server_addr(), inet_server_port();"
    echo ""
    
    echo -e "${GREEN}MySQL / MariaDB:${NC}"
    echo "  SELECT VERSION();"
    echo "  SHOW VARIABLES LIKE 'version%';"
    echo "  SELECT DATABASE(), USER();"
    echo ""
    
    echo -e "${GREEN}SQLite:${NC}"
    echo "  SELECT sqlite_version();"
    echo "  PRAGMA database_list;"
    echo ""
    
    echo -e "${GREEN}SQL Server:${NC}"
    echo "  SELECT @@VERSION;"
    echo ""
    
    print_warning "Copy and paste the appropriate query into your SQL Editor"
}

# Step 3: Inspect configuration files
step_3_config_inspection() {
    print_header "Step 3: Configuration File Inspection"
    
    echo "Searching for database configuration files and connection strings..."
    echo ""
    
    # Check for .env files
    if [ -f ".env" ]; then
        print_success "Found .env file"
        echo "Checking for database-related variables..."
        grep -i "database\|db_\|postgres\|mysql\|sqlite\|mssql\|supabase" .env 2>/dev/null || echo "  No database variables found"
        echo ""
    else
        print_warning "No .env file found"
    fi
    
    if [ -f ".env.example" ]; then
        print_success "Found .env.example file"
        echo "Checking for database-related variables..."
        grep -i "database\|db_\|postgres\|mysql\|sqlite\|mssql\|supabase" .env.example 2>/dev/null || echo "  No database variables found"
        echo ""
    fi
    
    # Check for config files
    print_info "Searching for configuration files..."
    config_files=$(find . -maxdepth 3 -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "*.toml" -o -name "*.conf" \) 2>/dev/null | grep -v node_modules | grep -v .git || true)
    
    if [ -n "$config_files" ]; then
        echo "Found configuration files:"
        echo "$config_files" | while read -r file; do
            echo "  - $file"
            # Check for database references
            if grep -qi "database\|db_\|postgres\|mysql\|sqlite" "$file" 2>/dev/null; then
                print_success "  Contains database references"
            fi
        done
        echo ""
    fi
    
    # Analyze connection strings
    print_info "Common connection string patterns:"
    echo "  postgresql://user:pass@host:5432/dbname  → PostgreSQL"
    echo "  mysql://user:pass@host:3306/dbname       → MySQL/MariaDB/Percona"
    echo "  sqlite:///path/to/db.sqlite              → SQLite"
    echo "  mssql://user:pass@host:1433/dbname       → SQL Server"
    echo ""
}

# Step 4: Docker/Kubernetes inspection
step_4_container_inspection() {
    print_header "Step 4: Docker / Kubernetes Container Inspection"
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        print_success "Docker is available"
        echo ""
        echo "Docker commands to run:"
        echo "  docker ps"
        echo "  docker exec -it <container> env | grep -i DB"
        echo "  docker exec -it <container> bash -c \"grep -Rni 'DATABASE_URL|DB_HOST' /app\""
        echo ""
        
        # Try to list containers
        if docker ps &> /dev/null; then
            print_info "Running containers:"
            docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null || true
            echo ""
        else
            print_warning "Cannot access Docker daemon (may need sudo)"
        fi
    else
        print_warning "Docker not found on this system"
    fi
    
    # Check if kubectl is available
    if command -v kubectl &> /dev/null; then
        print_success "kubectl is available"
        echo ""
        echo "Kubernetes commands to run:"
        echo "  kubectl get pods"
        echo "  kubectl exec -it <pod> -- env | grep -i DB"
        echo "  kubectl exec -it <pod> -- ls /app"
        echo ""
    else
        print_warning "kubectl not found on this system"
    fi
    echo ""
}

# Step 5: Search for SQL files
step_5_sql_file_search() {
    print_header "Step 5: SQL File Search"
    
    print_info "Searching for SQL files in the repository..."
    echo ""
    
    # Search for LOVABLE_FIX_ALL_TABLES.sql specifically
    lovable_fix_file=$(find . -type f -iname "LOVABLE_FIX_ALL_TABLES.sql" 2>/dev/null | grep -v .git || true)
    if [ -n "$lovable_fix_file" ]; then
        print_success "Found LOVABLE_FIX_ALL_TABLES.sql:"
        echo "$lovable_fix_file" | while read -r file; do
            echo "  - $file"
        done
        echo ""
    else
        print_warning "LOVABLE_FIX_ALL_TABLES.sql not found"
    fi
    
    # List all SQL files
    print_info "All SQL files in repository:"
    sql_files=$(find . -type f -name "*.sql" 2>/dev/null | grep -v node_modules | grep -v .git || true)
    
    if [ -n "$sql_files" ]; then
        echo "$sql_files" | while read -r file; do
            echo "  - $file"
        done
        echo ""
        
        # Count SQL files
        file_count=$(echo "$sql_files" | wc -l)
        print_success "Total SQL files found: $file_count"
    else
        print_warning "No SQL files found in repository"
    fi
    
    # Check for SQL directories
    print_info "Common SQL directories:"
    for dir in sql db/migrations supabase/migrations database migrations; do
        if [ -d "$dir" ]; then
            print_success "Found: $dir/"
            ls -1 "$dir" 2>/dev/null | head -5 | while read -r file; do
                echo "    - $file"
            done
            echo ""
        fi
    done
    echo ""
}

# Step 6: Direct DB connection testing
step_6_direct_connection() {
    print_header "Step 6: Direct Database Connection Testing"
    
    print_info "Database client commands for direct connection:"
    echo ""
    
    echo -e "${GREEN}PostgreSQL (psql):${NC}"
    echo "  PGPASSWORD=yourpass psql -h host -p 5432 -U user -d dbname -c \"SELECT version();\""
    echo ""
    
    echo -e "${GREEN}MySQL (mysql client):${NC}"
    echo "  MYSQL_PWD=yourpass mysql -h host -P 3306 -u user -e \"SELECT VERSION();\""
    echo ""
    
    echo -e "${GREEN}SQLite:${NC}"
    echo "  sqlite3 /path/to/db.sqlite \"SELECT sqlite_version();\""
    echo ""
    
    # Check if database clients are available
    print_info "Checking for installed database clients:"
    
    if command -v psql &> /dev/null; then
        print_success "psql (PostgreSQL client) is available"
    else
        print_warning "psql not found"
    fi
    
    if command -v mysql &> /dev/null; then
        print_success "mysql client is available"
    else
        print_warning "mysql not found"
    fi
    
    if command -v sqlite3 &> /dev/null; then
        print_success "sqlite3 is available"
    else
        print_warning "sqlite3 not found"
    fi
    
    echo ""
    
    # Check for connection info from environment
    if [ -f ".env" ]; then
        print_info "Checking .env for connection details..."
        if grep -q "SUPABASE" .env; then
            print_success "Found Supabase configuration"
            echo "  This appears to be using Supabase (PostgreSQL-based)"
            echo ""
            
            # Extract Supabase URL if present
            supabase_url=$(grep "VITE_SUPABASE_URL" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || true)
            if [ -n "$supabase_url" ]; then
                echo "  Supabase URL: $supabase_url"
                echo "  Database Type: PostgreSQL (Supabase uses PostgreSQL)"
                echo ""
            fi
        fi
    fi
}

# Step 7: Distinguish MySQL variants
step_7_mysql_variants() {
    print_header "Step 7: Distinguish MySQL vs MariaDB vs Percona"
    
    print_info "How to identify the variant from version string:"
    echo ""
    echo "  Version string contains 'MariaDB'        → MariaDB"
    echo "  Version string contains 'Percona Server' → Percona"
    echo "  Otherwise contains 'MySQL'               → MySQL"
    echo ""
    
    print_info "Example version strings:"
    echo "  '5.7.33-0ubuntu0.18.04.1'               → MySQL"
    echo "  '10.6.7-MariaDB-1:10.6.7+maria~focal'   → MariaDB"
    echo "  '8.0.26-17 Percona Server'              → Percona"
    echo ""
}

# Step 8: Web-access only fallback
step_8_web_access_fallback() {
    print_header "Step 8: Web-Access Only Fallback"
    
    print_info "If you only have web access and cannot execute SQL:"
    echo ""
    echo "  1. Check documentation or 'About' pages in the application"
    echo "  2. Contact Lovable support or your system administrator"
    echo "  3. Ask specifically for:"
    echo "     - Database engine type and version"
    echo "     - Location where SQL scripts are stored"
    echo "     - Whether Lovable exposes an API to list/export saved SQL"
    echo ""
}

# Summary function
print_summary() {
    print_header "Summary & Recommendations"
    
    # Analyze what we found
    if [ -f ".env" ] && grep -q "SUPABASE" .env; then
        print_success "Database Type Detected: PostgreSQL (via Supabase)"
        echo ""
        echo "Next steps:"
        echo "  1. Use PostgreSQL-specific queries for further diagnostics"
        echo "  2. Access Supabase dashboard for SQL Editor"
        echo "  3. Check supabase/migrations/ directory for SQL files"
        echo ""
    else
        print_warning "Could not automatically detect database type"
        echo ""
        echo "Recommended actions:"
        echo "  1. Check .env file for database connection strings"
        echo "  2. Run detection queries in your SQL Editor (Step 2)"
        echo "  3. Review configuration files found in Step 3"
        echo ""
    fi
    
    # SQL files summary
    sql_count=$(find . -type f -name "*.sql" 2>/dev/null | grep -v node_modules | grep -v .git | wc -l || echo "0")
    if [ "$sql_count" -gt 0 ]; then
        print_success "Found $sql_count SQL files in the repository"
    fi
    
    echo ""
    print_info "For detailed information on each step, review the output above."
}

# Main execution
main() {
    clear
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Database Detection & Diagnostic Tool                     ║"
    echo "║  Comprehensive 8-Step Database Analysis                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    step_1_admin_ui_check
    step_2_detection_queries
    step_3_config_inspection
    step_4_container_inspection
    step_5_sql_file_search
    step_6_direct_connection
    step_7_mysql_variants
    step_8_web_access_fallback
    print_summary
    
    echo ""
    print_success "Diagnostic scan complete!"
    echo ""
}

# Run main function
main "$@"
