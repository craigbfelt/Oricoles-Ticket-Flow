# 📝 Quick Reference Cheat Sheet

## One-Line Setup Commands

```bash
# Universal setup (detects OS)
./setup.sh

# macOS/Linux - Interactive
./setup-local.sh

# Windows - Interactive  
setup-local.bat

# macOS/Linux - Using Make
make setup-interactive
```

## Daily Development Workflow

### Starting Your Day

```bash
# Terminal 1: Start local services
npm run dev
# or
docker-compose up
# or
npx supabase start && npm run dev

# Terminal 2: Keep for git operations
# Ready for: git pull, git checkout, etc.
```

### Working with GitHub Copilot

```bash
# 1. Ask Copilot to make changes (on GitHub)
#    Copilot creates PR: copilot/some-feature

# 2. Pull and test locally
git fetch origin
git checkout copilot/some-feature
# Your app at localhost:8080 auto-reloads!

# 3. Test in browser

# 4. If good, merge PR on GitHub
#    If bad, comment on PR

# 5. Return to main
git checkout main
git pull origin main
```

## Common Commands

### Development
```bash
npm run dev          # Start dev server (http://localhost:8080)
npm run build        # Build for production
npm run lint         # Run linter
npm install          # Install dependencies
```

### Docker Compose
```bash
docker-compose up -d              # Start in background
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose ps                 # Check status
docker-compose restart            # Restart all
docker-compose restart <service>  # Restart one service
```

### Local Supabase
```bash
npx supabase start       # Start Supabase
npx supabase stop        # Stop Supabase
npx supabase status      # View status & credentials
npx supabase logs -f     # View logs
npx supabase db reset    # Reset database (⚠️ deletes data)
```

### Git Operations
```bash
git status                    # Check status
git pull origin main          # Update from GitHub
git fetch origin              # Fetch all branches
git checkout <branch>         # Switch branch
git add .                     # Stage changes
git commit -m "message"       # Commit
git push origin <branch>      # Push to GitHub
```

### Make Commands (macOS/Linux)
```bash
make help                # Show all commands
make prereqs             # Check prerequisites
make setup-docker        # Quick Docker setup
make setup-local         # Quick Supabase setup
make dev                 # Start dev server
make build               # Build app
make start               # Start Docker services
make stop                # Stop Docker services
make logs                # View Docker logs
make studio              # Open Supabase Studio
make app                 # Open app in browser
```

## Service URLs

### Docker Compose Setup
- App: http://localhost:8080 (after `npm run dev`)
- Supabase Studio: http://localhost:3000
- API Gateway: http://localhost:8000
- Mail UI (Inbucket): http://localhost:9000
- PostgreSQL: localhost:5432

### Local Supabase Setup
- App: http://localhost:8080 (after `npm run dev`)
- Supabase API: http://localhost:54321
- Supabase Studio: http://localhost:54323
- Email Testing: http://localhost:54324
- PostgreSQL: localhost:54322

## Troubleshooting

### Quick Fixes
```bash
# Interactive diagnostic tool
./troubleshoot.sh

# Common fixes
npm install                           # Reinstall dependencies
rm -rf node_modules && npm install    # Clean reinstall
docker-compose down && docker-compose up -d  # Restart Docker
npx supabase stop && npx supabase start      # Restart Supabase
lsof -i :8080                        # Check port 8080 (macOS/Linux)
netstat -ano | findstr :8080         # Check port 8080 (Windows)
```

### Port Conflicts
```bash
# Find process on port
lsof -i :<port>                      # macOS/Linux
netstat -ano | findstr :<port>       # Windows

# Kill process
kill -9 <PID>                        # macOS/Linux
taskkill /PID <PID> /F               # Windows
```

### Can't Connect to Database
```bash
# Docker Compose
docker-compose ps                    # Check if postgres is running
docker-compose restart postgres      # Restart postgres

# Local Supabase
npx supabase status                  # Check status
npx supabase db reset                # Reset (⚠️ deletes data)
```

## File Locations

### Configuration
- `.env` - Environment variables (Docker Compose)
- `.env.local` - Local environment (Supabase/dev)
- `.env.example` - Template
- `docker-compose.yml` - Docker services
- `vite.config.ts` - Vite configuration

### Code
- `src/` - Frontend code (React/TypeScript)
- `src/components/` - React components
- `src/pages/` - Page components
- `src/hooks/` - Custom React hooks
- `src/integrations/supabase/` - Supabase client

### Database
- `supabase/migrations/` - SQL migrations
- `supabase/config.toml` - Supabase config

### Scripts
- `setup-local.sh` - Interactive setup (Unix)
- `setup-local.bat` - Interactive setup (Windows)
- `troubleshoot.sh` - Diagnostic tool
- `scripts/` - Utility scripts

## Admin Emails (Auto-Admin)

Sign up with these emails to get automatic admin access:
- `admin@oricol.co.za`
- `craig@zerobitone.co.za`
- `admin@zerobitone.co.za`

## Need Help?

```bash
# Run diagnostics
./troubleshoot.sh

# Check prerequisites
make prereqs

# View documentation
cat AUTOMATED_SETUP.md
cat GITHUB_COPILOT_WITH_LOCAL_DEV.md
cat DOCKER_FREE_NO_ACCOUNT.md
```

## Remember

✅ Keep `npm run dev` running while developing  
✅ Pull Copilot changes: `git pull origin <branch>`  
✅ Test changes at http://localhost:8080  
✅ Docker Desktop is FREE (no account needed)  
✅ Use `git stash` before pulling if you have uncommitted changes  

❌ Don't commit `.env` or `.env.local` files  
❌ Don't run `npm run build` during development (use `npm run dev`)  
❌ Don't forget to pull before making new changes  

---

**Quick Start:** `./setup.sh` → `npm run dev` → Open http://localhost:8080 → Start coding! 🚀
