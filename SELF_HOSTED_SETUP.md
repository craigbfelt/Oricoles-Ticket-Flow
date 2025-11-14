# Self-Hosted Supabase Setup Guide

This guide will help you set up and run the Oricol Helpdesk app with a **completely self-hosted Supabase instance** using Docker. No cloud accounts or free tier limits required!

## 🎯 What You Get

- **Full Control**: Own your data and infrastructure
- **No Limits**: No storage, bandwidth, or API request limits
- **Free Forever**: Only costs are your hosting infrastructure
- **Production Ready**: Scalable and reliable architecture
- **Easy Migration**: Simple to move from cloud Supabase

## 📋 Prerequisites

- **Docker Desktop** installed ([Download here](https://www.docker.com/products/docker-desktop))
- **Node.js 18+** and npm installed
- **4GB+ RAM** available
- **10GB+ disk space** for Docker images and data

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
cd oricol-ticket-flow-34e64301
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Secure Keys (Production)

For production deployments, generate secure random keys:

```bash
./scripts/generate-keys.sh
```

Copy the output and update your `.env` file with the generated values.

### 4. Run Setup Script

```bash
./scripts/setup.sh
```

This script will:
- Create `.env` file from template if it doesn't exist
- Pull required Docker images
- Start all Supabase services
- Display access URLs and credentials

### 5. Update Frontend Configuration

Create or update the `.env` file in the project root:

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from .env>
```

### 6. Start the Application

```bash
npm run dev
```

The application will be available at: **http://localhost:8080**

## 📊 Service Access Points

Once running, you can access:

- **Frontend Application**: http://localhost:8080
- **Supabase Studio** (Database UI): http://localhost:3000
- **API Gateway**: http://localhost:8000
- **PostgreSQL Database**: localhost:5432
- **Mail UI** (Inbucket - for testing emails): http://localhost:9000

## 🔐 Default Credentials

### Supabase Studio
- Username: `supabase` (or check `DASHBOARD_USERNAME` in `.env`)
- Password: Check `DASHBOARD_PASSWORD` in `.env`

### PostgreSQL Database
- Host: `localhost`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: Check `POSTGRES_PASSWORD` in `.env`

## 🛠️ Management Commands

### Start Services
```bash
docker compose up -d
```

### Stop Services
```bash
docker compose stop
```

### Restart Services
```bash
docker compose restart
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
docker compose logs -f auth
docker compose logs -f storage
```

### Check Service Status
```bash
docker compose ps
```

### Stop and Remove Everything
```bash
docker compose down

# Remove data volumes as well (⚠️ DELETES ALL DATA)
docker compose down -v
```

## 💾 Backup and Restore

### Create Backup

```bash
./scripts/backup.sh
```

This creates timestamped backups in `./backups/`:
- Database SQL dump
- Storage files archive

### Restore from Backup

```bash
./scripts/restore.sh <backup_name>
```

Example:
```bash
./scripts/restore.sh oricol_backup_20250114_120000
```

### Automated Backups

Add a cron job for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/oricol-ticket-flow-34e64301 && ./scripts/backup.sh
```

## 🌍 Production Deployment

### Option 1: Deploy to VPS (DigitalOcean, Linode, etc.)

1. **Provision a VPS** with Docker support (minimum 2GB RAM, 20GB disk)

2. **Clone repository** on the VPS

3. **Generate production keys**:
   ```bash
   ./scripts/generate-keys.sh
   ```

4. **Update `.env` file** with generated keys and production URLs:
   ```env
   SITE_URL=https://your-domain.com
   API_EXTERNAL_URL=https://api.your-domain.com
   SUPABASE_PUBLIC_URL=https://api.your-domain.com
   ```

5. **Set up reverse proxy** (nginx or Caddy) to expose:
   - Frontend (port 8080) → https://your-domain.com
   - API Gateway (port 8000) → https://api.your-domain.com
   - Studio (port 3000) → https://studio.your-domain.com (optional)

6. **Start services**:
   ```bash
   ./scripts/setup.sh
   ```

### Option 2: Deploy to AWS/Azure/GCP

Use container orchestration services:
- **AWS**: ECS or EKS
- **Azure**: Container Instances or AKS
- **GCP**: Cloud Run or GKE

The `docker-compose.yml` can be converted to Kubernetes manifests using tools like [Kompose](https://kompose.io/).

### Option 3: Deploy to Railway/Render

Both platforms support Docker Compose deployments:

**Railway**:
```bash
npm install -g @railway/cli
railway login
railway up
```

**Render**:
- Use their Docker Compose support
- Configure environment variables in dashboard

## 🔒 Security Best Practices

### 1. Change Default Passwords

Update these in `.env`:
```env
POSTGRES_PASSWORD=<strong-random-password>
DASHBOARD_PASSWORD=<strong-random-password>
```

### 2. Generate Unique JWT Keys

Always use `./scripts/generate-keys.sh` for production deployments.

### 3. Use HTTPS in Production

Configure SSL certificates using:
- **Let's Encrypt** (free, automated)
- **Cloudflare** (free SSL proxy)
- **AWS Certificate Manager** (free for AWS services)

### 4. Restrict Database Access

Update `docker-compose.yml` to remove the PostgreSQL port exposure:
```yaml
postgres:
  # Comment out or remove the ports section
  # ports:
  #   - "5432:5432"
```

### 5. Enable Firewall

Only expose necessary ports (80, 443) to the internet.

## 🔄 Migrating from Cloud Supabase

### 1. Export Your Data

From Supabase Dashboard:
1. Go to Database → Backups
2. Download SQL dump
3. Download storage files

Or use SQL:
```bash
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### 2. Import to Self-Hosted

```bash
# Start self-hosted Supabase
./scripts/setup.sh

# Import database
docker compose exec -T postgres psql -U postgres postgres < backup.sql

# Copy storage files to volume
docker cp ./storage-files/. oricol-storage:/var/lib/storage/
```

### 3. Update Application Configuration

Update `.env`:
```env
VITE_SUPABASE_URL=http://localhost:8000  # or your production URL
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from .env>
```

### 4. Test and Verify

1. Test authentication
2. Verify data integrity
3. Check file uploads
4. Test all application features

## 📈 Scaling

### Horizontal Scaling

For high traffic, scale individual services:

```yaml
# docker-compose.yml
services:
  rest:
    deploy:
      replicas: 3
  auth:
    deploy:
      replicas: 2
```

### Database Replication

Set up PostgreSQL replication for read-heavy workloads:
1. Configure master-slave replication
2. Use read replicas for queries
3. Route writes to primary database

### Load Balancing

Use nginx or HAProxy to distribute traffic across replicas.

## 🐛 Troubleshooting

### Services Won't Start

Check logs:
```bash
docker compose logs -f
```

Common issues:
- Port conflicts (check if 5432, 8000, 3000 are available)
- Insufficient RAM (need 4GB+)
- Docker not running

### Database Connection Errors

1. Verify PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker compose logs postgres
   ```

3. Verify connection string in `.env`

### Storage Upload Failures

1. Check storage service logs:
   ```bash
   docker compose logs storage
   ```

2. Verify storage volume permissions:
   ```bash
   docker compose exec storage ls -la /var/lib/storage
   ```

3. Ensure bucket policies are configured (migrations should handle this)

### Email Not Working

The included mail server (Inbucket) is for development only. For production:

1. Configure SMTP settings in `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. Restart auth service:
   ```bash
   docker compose restart auth
   ```

## 📚 Additional Resources

- [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🆘 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Docker logs
3. Open an issue on GitHub

## 📝 License

This project is part of the Oricol ES helpdesk system.
