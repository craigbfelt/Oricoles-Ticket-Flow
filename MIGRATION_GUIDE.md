# Migration Guide: Cloud Supabase to Self-Hosted

This guide walks you through migrating your Oricol Helpdesk app from cloud Supabase to a self-hosted instance.

## 📋 Overview

**Migration Time**: 30-60 minutes  
**Downtime**: 5-10 minutes (during data transfer)  
**Difficulty**: Intermediate

## ⚠️ Before You Start

### Prerequisites
- Docker Desktop installed and running
- Access to your current Supabase project
- Admin access to your database
- ~10GB free disk space

### What Gets Migrated
✅ All database tables and data  
✅ User accounts and authentication  
✅ Storage files (images, documents)  
✅ Database functions and triggers  
✅ Row Level Security policies  

### What Doesn't Get Migrated
❌ Edge Functions (need manual setup)  
❌ Supabase project settings  
❌ Email templates (need reconfiguration)  

## 🚀 Migration Steps

### Step 1: Prepare Self-Hosted Environment

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
   cd oricol-ticket-flow-34e64301
   ```

2. **Generate secure keys**:
   ```bash
   ./scripts/generate-keys.sh
   ```
   
   Save the output - you'll need these keys!

3. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` with generated keys**:
   ```env
   POSTGRES_PASSWORD=<from-generate-keys.sh>
   JWT_SECRET=<from-generate-keys.sh>
   ANON_KEY=<from-generate-keys.sh>
   SERVICE_ROLE_KEY=<from-generate-keys.sh>
   
   # Site URLs (update for production)
   SITE_URL=http://localhost:8080
   API_EXTERNAL_URL=http://localhost:8000
   SUPABASE_PUBLIC_URL=http://localhost:8000
   ```

### Step 2: Export Data from Cloud Supabase

#### Option A: Using Supabase Dashboard (Easiest)

1. **Export database**:
   - Go to your Supabase project dashboard
   - Navigate to: Database → Backups
   - Click "Download" on your latest backup
   - Save as `cloud_backup.sql`

2. **Export storage files**:
   - Go to: Storage → (your bucket name)
   - Download all files
   - Save to `storage_backup/` folder

#### Option B: Using Command Line (More Complete)

1. **Get your database connection string**:
   - Go to: Settings → Database
   - Copy the connection string under "Connection string"

2. **Export database**:
   ```bash
   # Install PostgreSQL client if needed
   # Ubuntu/Debian: sudo apt-get install postgresql-client
   # macOS: brew install postgresql
   
   pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > cloud_backup.sql
   ```

3. **Export storage files**:
   ```bash
   # Create storage backup directory
   mkdir -p storage_backup
   
   # Use Supabase CLI or download from dashboard
   # This requires supabase CLI installed
   npx supabase storage download diagrams storage_backup/diagrams
   npx supabase storage download documents storage_backup/documents
   ```

### Step 3: Start Self-Hosted Supabase

1. **Start services**:
   ```bash
   ./scripts/setup.sh
   ```
   
   Wait for all services to start (about 30 seconds).

2. **Verify services are running**:
   ```bash
   docker compose ps
   ```
   
   All services should show "Up (healthy)".

### Step 4: Import Data to Self-Hosted

1. **Import database**:
   ```bash
   # Clear default database first
   docker compose exec -T postgres psql -U postgres postgres <<EOF
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   EOF
   
   # Import your data
   docker compose exec -T postgres psql -U postgres postgres < cloud_backup.sql
   ```

2. **Import storage files**:
   ```bash
   # Copy diagrams
   docker cp storage_backup/diagrams/. oricol-storage:/var/lib/storage/diagrams/
   
   # Copy documents
   docker cp storage_backup/documents/. oricol-storage:/var/lib/storage/documents/
   
   # Fix permissions
   docker compose exec storage chown -R postgres:postgres /var/lib/storage
   ```

3. **Verify import**:
   ```bash
   # Check database tables
   docker compose exec postgres psql -U postgres postgres -c "\dt"
   
   # Check storage files
   docker compose exec storage ls -la /var/lib/storage
   ```

### Step 5: Update Application Configuration

1. **Update frontend `.env`**:
   ```env
   VITE_SUPABASE_URL=http://localhost:8000
   VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from your .env>
   ```

2. **For production deployment**, update to your domain:
   ```env
   VITE_SUPABASE_URL=https://api.your-domain.com
   VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from your .env>
   ```

### Step 6: Test the Migration

1. **Restart services** to ensure everything loads correctly:
   ```bash
   docker compose restart
   ```

2. **Start the application**:
   ```bash
   npm install  # if not already done
   npm run dev
   ```

3. **Test key functionality**:
   - ✅ User login
   - ✅ View existing tickets
   - ✅ Create new ticket
   - ✅ View assets (if admin)
   - ✅ Upload document
   - ✅ View uploaded images

### Step 7: Update Production URLs (If Deploying to Server)

If you're deploying to a production server:

1. **Update `.env`**:
   ```env
   SITE_URL=https://helpdesk.your-domain.com
   API_EXTERNAL_URL=https://api.your-domain.com
   SUPABASE_PUBLIC_URL=https://api.your-domain.com
   ```

2. **Set up reverse proxy** (nginx example):
   ```nginx
   # Frontend
   server {
       listen 80;
       server_name helpdesk.your-domain.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   
   # API Gateway
   server {
       listen 80;
       server_name api.your-domain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Set up SSL** with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d helpdesk.your-domain.com -d api.your-domain.com
   ```

## 📊 Verifying Migration Success

### Database Check
```bash
# Count records in key tables
docker compose exec postgres psql -U postgres postgres <<EOF
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'ticket_comments', COUNT(*) FROM ticket_comments;
EOF
```

Compare these counts with your cloud database to ensure all data migrated.

### Storage Check
```bash
# List storage buckets and file counts
docker compose exec storage find /var/lib/storage -type f | wc -l
```

### Authentication Check
- Log in with an existing user account
- Try password reset (email will go to mail UI at http://localhost:9000)
- Create a new user account

## 🔧 Troubleshooting

### Database Import Errors

**Error**: "role 'xyz' does not exist"
```bash
# Create missing roles
docker compose exec postgres psql -U postgres postgres <<EOF
CREATE ROLE authenticator NOINHERIT LOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
EOF
```

### Storage Import Fails

**Error**: Permission denied
```bash
# Fix storage permissions
docker compose exec storage chown -R postgres:postgres /var/lib/storage
docker compose restart storage
```

### Users Can't Log In

**Error**: "Invalid JWT"

- Verify `JWT_SECRET` in `.env` matches
- Regenerate keys and update both `.env` files
- Restart auth service: `docker compose restart auth`

### Missing Edge Functions

Edge Functions need to be manually recreated:

1. Copy function code from `supabase/functions/` directory
2. Deploy to self-hosted using Deno Deploy or similar
3. Update function URLs in application code

## 🔄 Rollback Plan

If migration fails, you can quickly rollback:

1. **Stop self-hosted services**:
   ```bash
   docker compose down
   ```

2. **Revert frontend configuration**:
   ```bash
   git checkout .env
   ```

3. **Use cloud Supabase** by updating `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-cloud-anon-key>
   ```

## 📈 Post-Migration Tasks

### 1. Set Up Automated Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /path/to/oricol-ticket-flow-34e64301 && ./scripts/backup.sh
```

### 2. Monitor Disk Space
```bash
# Check Docker volumes
docker system df

# Check specific volumes
docker volume inspect oricol-ticket-flow-34e64301_postgres-data
docker volume inspect oricol-ticket-flow-34e64301_storage-data
```

### 3. Update Edge Functions

Manually recreate any Edge Functions you were using:
- `route-ticket-email`
- `sync-microsoft-365`
- `register-remote-client`
- etc.

See `supabase/functions/` for function code.

### 4. Configure Email Service

For production, configure real SMTP in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ENABLE_EMAIL_AUTOCONFIRM=false
```

## 🎉 Success!

You've successfully migrated to self-hosted Supabase!

**Benefits you now have**:
- ✅ Full control of your data
- ✅ No storage limits
- ✅ No API request limits
- ✅ No monthly costs
- ✅ Better privacy and security

## 📚 Additional Resources

- [Self-Hosted Setup Guide](./SELF_HOSTED_SETUP.md)
- [Backup and Restore](./SELF_HOSTED_SETUP.md#-backup-and-restore)
- [Production Deployment](./SELF_HOSTED_SETUP.md#-production-deployment)
- [Troubleshooting](./SELF_HOSTED_SETUP.md#-troubleshooting)

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker logs: `docker compose logs -f`
3. Open an issue on GitHub with details
