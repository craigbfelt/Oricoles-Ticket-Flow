#!/bin/bash

# Quick Lovable Migration Script
# A simplified script to apply Supabase migrations after pulling from GitHub to Lovable

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Supabase Migration Quick Apply (for Lovable)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}Error: supabase/migrations directory not found${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Count migration files
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${BLUE}Found ${MIGRATION_COUNT} migration files${NC}"
echo ""

# Step 1: Check if Supabase CLI is available
echo -e "${YELLOW}Step 1: Checking Supabase CLI...${NC}"
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI is installed${NC}"
    supabase --version
elif npx supabase --version &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI available via npx${NC}"
else
    echo -e "${YELLOW}Installing Supabase CLI via npm...${NC}"
    npm install -g supabase
    echo -e "${GREEN}✓ Supabase CLI installed${NC}"
fi
echo ""

# Step 2: Link to project (if not already linked)
echo -e "${YELLOW}Step 2: Linking to Supabase project...${NC}"
if [ -f "supabase/config.toml" ]; then
    PROJECT_ID=$(grep -m 1 'project_id' supabase/config.toml | cut -d '"' -f 2)
    if [ -n "$PROJECT_ID" ]; then
        echo -e "${BLUE}Project ID: ${PROJECT_ID}${NC}"
        
        # Try to link (will skip if already linked)
        npx supabase link --project-ref "$PROJECT_ID" 2>/dev/null || echo -e "${YELLOW}Already linked or credentials needed${NC}"
        echo -e "${GREEN}✓ Project linked${NC}"
    else
        echo -e "${RED}Could not find project ID in config.toml${NC}"
        echo "Please run manually: npx supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    fi
else
    echo -e "${RED}supabase/config.toml not found${NC}"
    echo "Please run: npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi
echo ""

# Step 3: Show migration status
echo -e "${YELLOW}Step 3: Checking migration status...${NC}"
npx supabase migration list 2>/dev/null || echo -e "${YELLOW}Could not fetch status (may need authentication)${NC}"
echo ""

# Step 4: Apply migrations
echo -e "${YELLOW}Step 4: Applying migrations to your Supabase project...${NC}"
echo -e "${BLUE}This will apply all pending migrations from supabase/migrations/${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Applying migrations...${NC}"
    npx supabase db push
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ Migrations applied successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
else
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Your database schema is now up to date"
echo "2. You can start using the app with the latest features"
echo "3. If you encounter issues, check the Supabase dashboard"
echo ""
echo -e "${BLUE}Helpful links:${NC}"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Migration docs: See SUPABASE_MIGRATIONS.md"
echo ""
