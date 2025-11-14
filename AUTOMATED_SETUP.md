# 🚀 Automated Local Setup Guide

> **💡 Important:** Docker Desktop is **100% FREE** for local development. No Docker Hub account, profile, or payment needed!  
> Just download, install, and use. If prompted to login, click "Continue without signing in."  
> See [DOCKER_FREE_NO_ACCOUNT.md](./DOCKER_FREE_NO_ACCOUNT.md) for details.

This guide provides **fully automated** setup scripts for running the Oricol Helpdesk app locally.

## 🎯 Quick Start (One Command)

### Option 1: Interactive Setup Wizard (Recommended)

**macOS/Linux:**
```bash
chmod +x setup-local.sh
./setup-local.sh
```

**Windows:**
```cmd
setup-local.bat
```

The interactive wizard will:
- ✅ Check all prerequisites (Node.js, Docker, etc.)
- ✅ Guide you through setup options
- ✅ Automatically configure environment files
- ✅ Start all required services
- ✅ Provide helpful next steps

### Option 2: Automated Docker Compose Setup

**Using Make (macOS/Linux):**
```bash
make setup-docker
```

**Manual (all platforms):**
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your preferred text editor
# Update POSTGRES_PASSWORD, JWT_SECRET, etc.

# Start services
docker-compose up -d --build
```

### Option 3: Automated Local Supabase Setup

**Using Make (macOS/Linux):**
```bash
make setup-local
```

**Manual (all platforms):**
```bash
# Install dependencies
npm install

# Start Supabase
npx supabase start

# Create environment file
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<paste-anon-key-from-supabase-start>
EOF

# Start development server
npm run dev
```

---

## 📋 Prerequisites Check

Before starting, check that you have everything:

```bash
# macOS/Linux
make prereqs

# Windows
# Run the interactive wizard and select option 4
```

**Required:**
- Node.js 18+ ([download FREE](https://nodejs.org/))
- npm (comes with Node.js)

**Optional (depends on setup method):**
- Docker Desktop ([download FREE](https://www.docker.com/products/docker-desktop))
  - **100% FREE for local development**
  - **No account, profile, or payment needed**
  - **No login required** - just download and use
  - See [DOCKER_FREE_NO_ACCOUNT.md](./DOCKER_FREE_NO_ACCOUNT.md) for details

---

## 🎨 Setup Methods Comparison

| Method | Best For | Requirements | Pros | Cons |
|--------|----------|--------------|------|------|
| **Docker Compose** | Production-like environment | Docker Desktop (FREE) | Complete stack, all services | Higher resource usage |
| **Local Supabase** | Development | Docker (FREE), Node.js | Full features, lightweight | Requires Docker |
| **Native Node** | Minimal setup | Node.js only | Minimal resources | Need external DB |

**Note:** Docker Desktop is **100% FREE** for local development. No account, login, or payment needed!  
See [DOCKER_FREE_NO_ACCOUNT.md](./DOCKER_FREE_NO_ACCOUNT.md) for details.

---

## 🐳 Docker Compose Setup (Detailed)

### What It Includes
- PostgreSQL 15 database
- Supabase services (Auth, Storage, Realtime, REST API)
- Supabase Studio (database UI)
- Kong API Gateway
- Mail server for testing (Inbucket)
- Image transformation (ImgProxy)

### Automated Setup

```bash
# Interactive wizard
./setup-local.sh
# Choose option 1

# OR use Make
make setup-docker

# OR manual
docker-compose up -d --build
```

### Access Points

After setup completes:
- **App:** http://localhost:8080
- **Supabase Studio:** http://localhost:3000
- **API Gateway:** http://localhost:8000
- **Mail UI:** http://localhost:9000
- **PostgreSQL:** localhost:5432

### Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart
docker-compose restart

# Check status
docker-compose ps

# View specific service logs
docker-compose logs -f <service_name>
```

---

## 🗄️ Local Supabase Setup (Detailed)

### What It Includes
- Local Supabase instance (Docker-based)
- PostgreSQL database
- All Supabase services
- Supabase Studio
- Email testing (Inbucket)

### Automated Setup

```bash
# Interactive wizard
./setup-local.sh
# Choose option 2

# OR use Make
make setup-local

# OR manual
npm install
npx supabase start
# Copy anon key from output
echo "VITE_SUPABASE_URL=http://localhost:54321" > .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>" >> .env.local
npm run dev
```

### Access Points

After setup completes:
- **App:** http://localhost:8080 (after `npm run dev`)
- **Supabase API:** http://localhost:54321
- **Supabase Studio:** http://localhost:54323
- **Email Testing:** http://localhost:54324
- **PostgreSQL:** postgresql://postgres:postgres@localhost:54322/postgres

### Common Commands

```bash
# Check Supabase status
npx supabase status

# Stop Supabase
npx supabase stop

# Start Supabase
npx supabase start

# View logs
npx supabase logs -f

# Reset database (WARNING: deletes data)
npx supabase db reset

# Run migrations
npx supabase db push
```

---

## 💻 Native Node.js Setup (Detailed)

### What It Includes
- Frontend development server
- Connection to cloud Supabase or local PostgreSQL

### Automated Setup

```bash
# Interactive wizard
./setup-local.sh
# Choose option 3

# OR manual
npm install
# Create .env with your Supabase credentials
npm run dev
```

### Database Options

**Option A: Cloud Supabase**
1. Create project at [supabase.com](https://supabase.com)
2. Get API URL and anon key from project settings
3. Add to `.env`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

**Option B: Local PostgreSQL**
```bash
# Start PostgreSQL with Docker
docker run --name oricol-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=oricol \
  -p 5432:5432 \
  -d postgres:15

# Add to .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oricol
```

---

## 🛠️ Makefile Commands

The Makefile provides convenient shortcuts:

```bash
# Setup
make prereqs              # Check prerequisites
make setup-interactive    # Run interactive wizard
make setup-docker         # Automated Docker setup
make setup-local          # Automated local Supabase setup

# Development
make dev                  # Start dev server
make build                # Build for production
make install              # Install dependencies
make lint                 # Run linter

# Services (Docker Compose)
make start                # Start services
make stop                 # Stop services
make restart              # Restart services
make logs                 # View logs
make status               # Check status

# Database
make backup               # Backup database
make restore BACKUP_NAME=<name>  # Restore backup
make migrate              # Run migrations

# Utilities
make studio               # Open Supabase Studio
make app                  # Open app in browser
make keys                 # Generate secure keys
make update               # Update Docker images
make clean                # Remove all data (⚠️  DANGEROUS)
```

---

## 🔧 Troubleshooting

### Port Conflicts

If ports are already in use:

**Find what's using the port:**
```bash
# macOS/Linux
lsof -i :<port>

# Windows
netstat -ano | findstr :<port>
```

**Kill the process:**
```bash
# macOS/Linux
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

**Common ports used:**
- 8080: Frontend app
- 5432: PostgreSQL
- 3000: Supabase Studio (Docker Compose)
- 54321: Supabase API (Local Supabase)
- 54323: Supabase Studio (Local Supabase)

### Docker Issues

**Docker daemon not running:**
```bash
# Start Docker Desktop application
# Wait for it to fully start
# Try again
```

**Out of memory:**
- Increase Docker memory limit in Docker Desktop settings
- Minimum 4GB recommended for full stack

**Containers won't start:**
```bash
# Clean up and try again
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### Supabase Issues

**Migrations not applied:**
```bash
# Local Supabase
npx supabase db reset

# Docker Compose
docker-compose restart postgres
```

**Can't connect to Supabase:**
```bash
# Check if running
npx supabase status

# Restart
npx supabase stop
npx supabase start
```

### Node.js Issues

**Dependencies won't install:**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Build fails:**
```bash
# Check Node.js version (need 18+)
node --version

# Update Node.js if needed
# Using nvm:
nvm install 18
nvm use 18
```

---

## 🔐 Security Notes

### For Development
The default keys in `.env.example` are fine for local development.

### For Production
**ALWAYS** generate new secure keys:
```bash
# Using provided script
./scripts/generate-keys.sh

# OR using Make
make keys

# Update .env with the generated keys
```

**Never commit** these to version control:
- `.env`
- `.env.local`
- `.env.production`

---

## 📚 Next Steps

After successful setup:

1. **Create your first user:**
   - Open http://localhost:8080 (or your app URL)
   - Click "Sign Up"
   - Use one of these admin emails:
     - `admin@oricol.co.za`
     - `craig@zerobitone.co.za`
     - `admin@zerobitone.co.za`

2. **Explore Supabase Studio:**
   - Database tables and structure
   - User authentication
   - Storage buckets
   - Run SQL queries

3. **Start developing:**
   - Frontend code is in `/src`
   - Supabase migrations in `/supabase/migrations`
   - Make changes and hot-reload will update the app

4. **Test features:**
   - Create tickets
   - Upload documents
   - Test email notifications (check Inbucket)

---

## 🆘 Getting Help

If you encounter issues:

1. **Check this guide** for troubleshooting steps
2. **View detailed docs:**
   - [QUICK_START_LOCAL.md](./QUICK_START_LOCAL.md)
   - [LOCAL_SETUP.md](./LOCAL_SETUP.md)
   - [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md)
3. **Check logs:**
   ```bash
   # Docker Compose
   docker-compose logs -f
   
   # Local Supabase
   npx supabase logs -f
   
   # Frontend
   # Check terminal where npm run dev is running
   ```
4. **Open an issue** on GitHub with:
   - What setup method you used
   - Your OS and versions
   - Complete error message
   - Steps to reproduce

---

## ✅ What You Get

After running the automation scripts:

- ✅ All prerequisites checked
- ✅ Dependencies installed
- ✅ Database running (PostgreSQL + Supabase)
- ✅ Environment configured
- ✅ Services started
- ✅ App accessible in browser
- ✅ Development tools ready
- ✅ Documentation and next steps provided

**Happy coding! 🚀**
