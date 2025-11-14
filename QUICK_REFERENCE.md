# Quick Reference - Self-Hosted Supabase Commands

## 🚀 Initial Setup

```bash
# One-command setup
./scripts/setup.sh

# Or using Make
make setup
```

## 🎮 Daily Operations

### Start/Stop Services

```bash
# Start all services
docker compose up -d
# or
make start

# Stop all services
docker compose stop
# or
make stop

# Restart all services
docker compose restart
# or
make restart
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
docker compose logs -f auth
docker compose logs -f storage

# Using Make
make logs
```

### Check Status

```bash
# Service status
docker compose ps

# Using Make
make status
```

## 💾 Backup & Restore

### Create Backup

```bash
# Create backup
./scripts/backup.sh

# Using Make
make backup
```

Backups are saved to `./backups/` with timestamp.

### Restore from Backup

```bash
# List available backups
ls -1 ./backups/*.sql

# Restore specific backup
./scripts/restore.sh oricol_backup_20250114_120000

# Using Make
make restore BACKUP_NAME=oricol_backup_20250114_120000
```

## 🔑 Security

### Generate New Keys

```bash
# Generate secure keys for production
./scripts/generate-keys.sh

# Using Make
make keys
```

Then update `.env` with the generated values.

### Change Passwords

Edit `.env` file:
```env
POSTGRES_PASSWORD=<new-password>
DASHBOARD_PASSWORD=<new-password>
```

Then restart:
```bash
docker compose restart
```

## 🌐 Access URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend App** | http://localhost:8080 | Main application |
| **Supabase Studio** | http://localhost:3000 | Database UI |
| **API Gateway** | http://localhost:8000 | REST API |
| **Mail UI** | http://localhost:9000 | Email testing |
| **PostgreSQL** | localhost:5432 | Direct DB access |

## 🔧 Database Operations

### Connect to Database

```bash
# Using psql inside container
docker compose exec postgres psql -U postgres postgres

# From host machine (if psql installed)
PGPASSWORD=<your-password> psql -h localhost -p 5432 -U postgres postgres
```

### Run SQL Commands

```bash
# Execute SQL file
docker compose exec -T postgres psql -U postgres postgres < migration.sql

# Execute inline SQL
docker compose exec postgres psql -U postgres postgres -c "SELECT COUNT(*) FROM tickets;"
```

### View Tables

```bash
docker compose exec postgres psql -U postgres postgres -c "\dt"
```

## 📦 Storage Operations

### List Storage Files

```bash
docker compose exec storage ls -la /var/lib/storage
```

### Copy Files to Storage

```bash
# Copy directory
docker cp ./local-files/. oricol-storage:/var/lib/storage/

# Fix permissions after copy
docker compose exec storage chown -R postgres:postgres /var/lib/storage
```

### Download Files from Storage

```bash
docker cp oricol-storage:/var/lib/storage/. ./local-backup/
```

## 🛠️ Maintenance

### Update Docker Images

```bash
# Pull latest images
docker compose pull

# Using Make
make update

# Restart to apply updates
docker compose restart
# or
make restart
```

### Clean Up Unused Resources

```bash
# Remove unused Docker images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything (keeps volumes)
docker system prune -a
```

### Complete Reset (⚠️ DELETES ALL DATA)

```bash
# Stop and remove everything including data
docker compose down -v

# Using Make
make clean
```

## 🚀 Frontend Development

### Start Development Server

```bash
npm run dev

# Using Make
make dev
```

### Build for Production

```bash
npm run build

# Using Make
make build
```

### Run Linter

```bash
npm run lint

# Using Make
make lint
```

## 🔍 Troubleshooting

### Check Service Health

```bash
# View all services
docker compose ps

# Check specific service logs
docker compose logs <service-name>

# Follow logs in real-time
docker compose logs -f <service-name>
```

### Restart Specific Service

```bash
docker compose restart <service-name>

# Examples:
docker compose restart postgres
docker compose restart auth
docker compose restart storage
```

### Debug Container

```bash
# Enter container shell
docker compose exec <service-name> sh

# Examples:
docker compose exec postgres sh
docker compose exec storage sh
```

### Check Disk Space

```bash
# Docker volumes usage
docker system df -v

# Specific volume
docker volume inspect oricol-ticket-flow-34e64301_postgres-data
```

## 📊 Monitoring

### Database Size

```bash
docker compose exec postgres psql -U postgres postgres -c "
SELECT 
    pg_size_pretty(pg_database_size('postgres')) as database_size;
"
```

### Table Sizes

```bash
docker compose exec postgres psql -U postgres postgres -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Storage Usage

```bash
docker compose exec storage du -sh /var/lib/storage/*
```

## 🎯 Common Tasks

### Reset User Password

```bash
docker compose exec postgres psql -U postgres postgres -c "
UPDATE auth.users 
SET encrypted_password = crypt('newpassword', gen_salt('bf'))
WHERE email = 'user@example.com';
"
```

### Create Admin User

```bash
docker compose exec postgres psql -U postgres postgres <<EOF
-- Insert into auth.users (handled by Supabase)
-- Add to user_roles
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;
EOF
```

### List Active Sessions

```bash
docker compose exec postgres psql -U postgres postgres -c "
SELECT pid, usename, application_name, client_addr, state, query_start
FROM pg_stat_activity
WHERE state = 'active';
"
```

## 🌐 Production Deployment

### Environment Setup

```bash
# Copy production env template
cp .env.example .env.production

# Edit with production values
vim .env.production

# Use production env
docker compose --env-file .env.production up -d
```

### Deploy Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Or using Make
make prod
```

## 📖 More Help

- Full Setup Guide: [SELF_HOSTED_SETUP.md](./SELF_HOSTED_SETUP.md)
- Migration Guide: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- Makefile Help: `make help`

## 💡 Pro Tips

1. **Use Make commands** for shorter syntax:
   ```bash
   make start      # instead of docker compose up -d
   make logs       # instead of docker compose logs -f
   make status     # instead of docker compose ps
   ```

2. **Set up shell aliases** in `~/.bashrc` or `~/.zshrc`:
   ```bash
   alias dc='docker compose'
   alias dclogs='docker compose logs -f'
   alias dcps='docker compose ps'
   ```

3. **Regular backups**: Add to crontab for automated backups:
   ```bash
   0 2 * * * cd /path/to/project && ./scripts/backup.sh
   ```

4. **Monitor disk space**: Set up alerts when Docker volumes exceed 80%

5. **Keep images updated**: Run `make update` monthly to get security patches
