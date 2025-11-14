# Summary: Lovable Deployment Preservation Setup

## What Was Done

This PR adds the ability to preserve the current lovable deployment while running a local development copy simultaneously, without conflicts.

## Files Created

### Configuration Files
- **`.env.local`** - Local development environment configuration (NOT in git)
- **`.env.lovable`** - Lovable/cloud environment configuration (NOT in git)
- **`docker-compose.override.local.yml`** - Docker overrides for local dev (alternate ports)
- **`docker-compose.override.lovable.yml`** - Docker overrides for lovable deployment

### Helper Scripts
- **`switch-config.sh`** - Linux/Mac script to switch between local/lovable configs
- **`switch-config.bat`** - Windows script to switch between local/lovable configs

### Documentation
- **`LOVABLE_PRESERVE_GUIDE.md`** - Complete guide for running both instances
- **`CREATE_LOVABLE_PRESERVE_BRANCH.md`** - Instructions for creating the preserved branch
- **`SUMMARY_LOVABLE_PRESERVE.md`** - This summary file

### Files Modified
- **`.gitignore`** - Added `.env.lovable` to prevent committing secrets
- **`.env.example`** - Updated with instructions for new setup
- **`README.md`** - Added references to new guides
- **`.env`** - Removed from git tracking (was previously tracked)

## Quick Start

### Switch to Local Development
```bash
./switch-config.sh local
docker compose -f docker-compose.yml -f docker-compose.override.local.yml up -d
npm run dev
```

Access at:
- Frontend: http://localhost:5173
- API: http://localhost:8001
- Studio: http://localhost:3001

### Switch to Lovable/Cloud
```bash
./switch-config.sh lovable
npm run build && npm run preview
```

## Port Mappings

### Local Development (docker-compose.override.local.yml)
- PostgreSQL: **5433** (instead of 5432)
- Kong API: **8001** (instead of 8000)
- Studio: **3001** (instead of 3000)
- Mail UI: **9001** (instead of 9000)

### Lovable Deployment (standard ports)
- PostgreSQL: **5432**
- Kong API: **8000**
- Studio: **3000**
- Mail UI: **9000**

## Volume Separation

### Local Development
- `postgres-data-local`
- `storage-data-local`

### Lovable Deployment
- `postgres-data-lovable` (or standard `postgres-data` and `storage-data`)

## Security Notes

✅ **Secret files NOT committed:**
- `.env.local` - in .gitignore
- `.env.lovable` - in .gitignore
- `.env` - removed from tracking

✅ **What's in git:**
- `.env.example` - Template with dummy values
- Docker override files - Configuration only, no secrets
- Helper scripts - Safe to commit

## Next Steps

### 1. Create the Lovable Preserve Branch

You need to create a branch that pins the current lovable deployment. This requires push access to the repository.

**Via GitHub Web UI:**
1. Go to https://github.com/craigfelt/oricol-ticket-flow-34e64301/commit/808152c
2. Click the `<>` button to browse repository at this commit
3. Use the branch dropdown to create `lovable-preserve` branch

**Or via command line:**
```bash
git checkout -b lovable-preserve 808152c
git push origin lovable-preserve
```

See `CREATE_LOVABLE_PRESERVE_BRANCH.md` for detailed instructions.

### 2. Configure Lovable to Use Preserved Branch

In your lovable deployment settings:
1. Change deployment branch from `main` to `lovable-preserve`
2. Save the configuration

Lovable will now continue running the stable version from commit 808152c.

### 3. Continue Development

- Make changes on `main` or feature branches
- Test locally using `.env.local` configuration
- Lovable remains unaffected on `lovable-preserve` branch
- When ready, update lovable to point to a new stable branch/tag

## Testing the Setup

### Test Local Configuration
```bash
# Switch to local
./switch-config.sh local

# Verify .env has local settings
head -10 .env

# Start services
docker compose -f docker-compose.yml -f docker-compose.override.local.yml up -d

# Check services are on alternate ports
docker compose -f docker-compose.yml -f docker-compose.override.local.yml ps
```

### Test Lovable Configuration
```bash
# Switch to lovable
./switch-config.sh lovable

# Verify .env has lovable settings
head -10 .env

# For cloud Supabase (typical for lovable)
npm run build && npm run preview

# Or for self-hosted
docker compose -f docker-compose.yml -f docker-compose.override.lovable.yml up -d
```

## Troubleshooting

### Port Conflicts
If you get "port already in use" errors:
```bash
# Check what's using the port
lsof -i :8001

# Stop services
docker compose -f docker-compose.yml -f docker-compose.override.local.yml down
```

### Wrong Configuration
If the app connects to the wrong backend:
```bash
# Check active config
cat .env | head -5

# Switch config
./switch-config.sh local   # or lovable
```

### Can't Create Branch
If you can't push the `lovable-preserve` branch:
1. Ask repository owner to create it
2. Or provide the instructions in `CREATE_LOVABLE_PRESERVE_BRANCH.md`
3. Or use GitHub web UI (doesn't require push access)

## Benefits

✅ **Lovable Protected** - Runs from pinned branch/tag, won't be affected by new changes
✅ **Local Development** - Full local environment with separate ports/volumes
✅ **No Conflicts** - Different ports and volumes prevent collisions
✅ **Easy Switching** - One command to switch between configs
✅ **Secure** - Secrets not committed, each environment has own credentials
✅ **Flexible** - Can run both simultaneously on same machine

## Documentation

For more details, see:
- **[LOVABLE_PRESERVE_GUIDE.md](./LOVABLE_PRESERVE_GUIDE.md)** - Complete usage guide
- **[CREATE_LOVABLE_PRESERVE_BRANCH.md](./CREATE_LOVABLE_PRESERVE_BRANCH.md)** - Branch creation instructions
- **[README.md](./README.md)** - Main project README

## Support

If you encounter issues:
1. Check the troubleshooting section in LOVABLE_PRESERVE_GUIDE.md
2. Verify .env file has correct configuration
3. Check docker-compose logs for errors
4. Open an issue at: https://github.com/craigfelt/oricol-ticket-flow-34e64301/issues
