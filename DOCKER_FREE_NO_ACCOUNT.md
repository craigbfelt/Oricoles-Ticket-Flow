# 🆓 Docker Desktop - Free Local Use (No Account Required)

## Important: Docker Desktop is FREE for Local Development

**You do NOT need:**
- ❌ A Docker Hub account
- ❌ To create a Docker profile  
- ❌ To pay anything
- ❌ To sign up for anything

**Docker Desktop is completely free for:**
- ✅ Personal use
- ✅ Small businesses (<250 employees, <$10M revenue)
- ✅ Education
- ✅ Open source projects

## How to Use Docker Desktop Locally (No Account)

### Installation

1. **Download Docker Desktop** (100% free):
   - **Windows:** https://docs.docker.com/desktop/install/windows-install/
   - **macOS:** https://docs.docker.com/desktop/install/mac-install/
   - **Linux:** https://docs.docker.com/desktop/install/linux-install/

2. **Install** - Just run the installer, no account needed

3. **Skip login** - When Docker Desktop starts:
   - You may see a login prompt
   - Click "Continue without signing in" or close the prompt
   - Docker Desktop works perfectly without logging in

4. **Start using it** - That's it! You can now run:
   ```bash
   docker --version
   docker-compose --version
   ```

## Running This Project Without Docker Hub Account

### Option 1: Docker Compose (Recommended)

All images we use are **public** and don't require authentication:

```bash
# No login needed - just run this
docker-compose up -d --build

# Docker will automatically pull public images:
# - supabase/postgres (public)
# - supabase/studio (public)
# - kong (public)
# - postgrest/postgrest (public)
# - etc.
```

### Option 2: Local Supabase CLI

```bash
# No Docker Hub account needed
npx supabase start

# Uses public Docker images automatically
```

### Option 3: Individual Containers

```bash
# Example: Start PostgreSQL (no account needed)
docker run --name oricol-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=oricol \
  -p 5432:5432 \
  -d postgres:15

# All official images are public
```

## What If Docker Desktop Asks for Login?

If Docker Desktop prompts for login during startup:

1. **Click "Continue without signing in"** or
2. **Close the login dialog** or  
3. **Click the X** to dismiss

Docker Desktop will work perfectly without logging in for local development.

## Rate Limits (Only Affects Anonymous Pulls)

Docker Hub has rate limits for anonymous users:
- **100 pulls per 6 hours** (without login)
- **200 pulls per 6 hours** (free account)

**For this project:** You'll only pull images once during setup, so you're well within limits.

**If you hit rate limits (rare):**
1. Wait 6 hours, or
2. Create a free Docker Hub account (still no payment needed)

## Alternative: No Docker at All

If you prefer not to use Docker at all:

### Use Cloud Supabase (Free Tier)

```bash
# 1. Create free account at supabase.com
# 2. Create new project (free tier)
# 3. Get your credentials from project settings
# 4. Create .env:
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EOF

# 5. Start app
npm install
npm run dev
```

**Supabase free tier includes:**
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- 100% free forever (no credit card required)

### Use PostgreSQL Directly (No Docker)

Install PostgreSQL natively:

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

**Linux:**
```bash
sudo apt-get install postgresql-15
```

Then configure `.env` to point to your local PostgreSQL.

## Summary

✅ **Docker Desktop is FREE** for local development  
✅ **No account required** to run this project  
✅ **No payment needed** ever for local use  
✅ **All images are public** and freely available  
✅ **Alternative options** available if you prefer no Docker  

Just download, install, and run - no signup, no login, no payment!

---

## Quick Start Commands (No Account Needed)

```bash
# Install Docker Desktop (free, no account)
# Download from docker.com

# Run this project
./setup-local.sh

# Or manually:
docker-compose up -d --build

# No login prompt? Perfect! You're ready to go.
# See login prompt? Click "Continue without signing in"
```

That's it! 🚀
