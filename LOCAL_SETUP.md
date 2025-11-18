# Local Development Setup - No Cloud Required

This guide shows you how to run the Oricol Helpdesk app **100% locally** on your computer without any cloud services, Supabase, or Vercel.

## Quick Start (Docker Method - Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Node.js 18+ installed
- 4GB+ RAM available

### Steps

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd oricol-ticket-flow-34e64301
   npm install
   ```

2. **Start Local Supabase**
   ```bash
   # This starts a complete Supabase instance locally via Docker
   npx supabase start
   ```
   
   **Output will include:**
   ```
   API URL: http://localhost:54321
   GraphQL URL: http://localhost:54321/graphql/v1
   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
   Studio URL: http://localhost:54323
   Inbucket URL: http://localhost:54324
   JWT secret: super-secret-jwt-token
   anon key: <your-anon-key>
   service_role key: <your-service-role-key>
   ```

3. **Create Local Environment File**
   
   Create `.env.local`:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-step-2>
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the App**
   - Application: http://localhost:8080
   - Database Admin (Supabase Studio): http://localhost:54323
   - Email Testing (Inbucket): http://localhost:54324

### Managing Local Supabase

```bash
# Stop Supabase
npx supabase stop

# Start Supabase  
npx supabase start

# Reset database (WARNING: deletes all data)
npx supabase db reset

# View status
npx supabase status

# View logs
npx supabase logs
```

---

## Alternative: JSON Server Method (No Docker)

If you can't use Docker, this method uses a simple JSON file as a database.

### Prerequisites
- Node.js 18+ only

### Steps

1. **Install json-server**
   ```bash
   npm install --save-dev json-server
   ```

2. **Create Mock Database**
   
   Create `db.json`:
   ```json
   {
     "users": [],
     "tickets": [],
     "assets": [],
     "profiles": []
   }
   ```

3. **Add Script to package.json**
   ```json
   {
     "scripts": {
       "backend": "json-server --watch db.json --port 3001",
       "dev:full": "npm run backend & npm run dev"
     }
   }
   ```

4. **Update App Code**
   - Replace Supabase client with fetch/axios calls to `http://localhost:3001`
   - This requires code changes (see MIGRATION.md for details)

---

## Alternative: SQLite Method (Lightweight)

Use SQLite instead of PostgreSQL for ultra-lightweight local development.

### Prerequisites
- Node.js 18+
- Better-SQLite3 package

### Steps

1. **Install Dependencies**
   ```bash
   npm install better-sqlite3 express cors
   ```

2. **Create Simple Backend Server**
   
   Create `server/index.js`:
   ```javascript
   const express = require('express');
   const Database = require('better-sqlite3');
   const cors = require('cors');

   const app = express();
   const db = new Database('helpdesk.db');

   app.use(cors());
   app.use(express.json());

   // Initialize database
   db.exec(`
     CREATE TABLE IF NOT EXISTS tickets (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL,
       description TEXT,
       status TEXT DEFAULT 'open',
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     )
   `);

   // API endpoints
   app.get('/api/tickets', (req, res) => {
     const tickets = db.prepare('SELECT * FROM tickets').all();
     res.json(tickets);
   });

   app.post('/api/tickets', (req, res) => {
     const { title, description } = req.body;
     const result = db.prepare(
       'INSERT INTO tickets (title, description) VALUES (?, ?)'
     ).run(title, description);
     res.json({ id: result.lastInsertRowid });
   });

   app.listen(3001, () => {
     console.log('Server running on http://localhost:3001');
   });
   ```

3. **Start Backend**
   ```bash
   node server/index.js
   ```

4. **Update App** to use `http://localhost:3001/api` instead of Supabase

---

## Development Workflow

### Using Local Supabase (Recommended)

```bash
# Terminal 1: Start Supabase
npx supabase start

# Terminal 2: Start app
npm run dev

# Terminal 3: Access Supabase Studio
# Open http://localhost:54323 in browser
```

### Accessing Supabase Studio

Supabase Studio is a web-based database management tool:
- URL: http://localhost:54323
- View and edit database tables
- Run SQL queries
- Manage users
- View logs

### Testing Emails

Local Supabase includes Inbucket for email testing:
- URL: http://localhost:54324
- All emails sent by the app appear here
- Great for testing auth emails, notifications, etc.

---

## Database Management

### Viewing Database

```bash
# Connect to PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

# Or use Supabase Studio
# http://localhost:54323
```

### Running Migrations

All migrations in `supabase/migrations/` are automatically applied when you run `npx supabase start`.

### Creating New Migrations

```bash
# Create a new migration file
npx supabase migration new <migration_name>

# Apply migrations
npx supabase db reset
```

### Backing Up Data

```bash
# Export database
npx supabase db dump -f backup.sql

# Import database
psql postgresql://postgres:postgres@localhost:54322/postgres < backup.sql
```

---

## Troubleshooting

### "Docker not found"
**Solution**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

### "Port 54321 already in use"
**Solution**: 
```bash
npx supabase stop
# Find what's using the port
lsof -i :54321  # Mac/Linux
netstat -ano | findstr :54321  # Windows
```

### "Containers won't start"
**Solution**:
```bash
# Stop and remove all containers
npx supabase stop --no-backup
docker system prune -a
npx supabase start
```

### "Migrations failing"
**Solution**:
```bash
# Reset database completely
npx supabase db reset
```

### "Out of memory"
**Solution**:
- Close other Docker containers
- Increase Docker memory limit in Docker Desktop settings
- Minimum 4GB recommended

---

## Performance Tips

1. **Use SSD** for Docker volumes (much faster)
2. **Allocate enough RAM** to Docker (4GB minimum)
3. **Disable unnecessary containers** if memory is limited
4. **Use WSL2** on Windows for better performance

---

## Moving to Production

When ready to deploy:

1. **Option 1**: Deploy local Supabase to Railway/Render
   ```bash
   # Use Railway CLI to deploy
   railway up
   ```

2. **Option 2**: Use Supabase free tier
   ```bash
   # Link to cloud project
   npx supabase link --project-ref <your-ref>
   # Push migrations
   npx supabase db push
   ```

3. **Option 3**: Use managed PostgreSQL
   - Update connection string in .env
   - Run migrations manually

---

## Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Local Supabase (Docker)** | Complete feature parity, no code changes | Requires Docker, uses more RAM | Development |
| **JSON Server** | Ultra simple, no Docker | No auth, limited features, requires code changes | Quick prototyping |
| **SQLite + Express** | Lightweight, no Docker | Requires custom backend, some code changes | Simple apps |

**Recommendation**: Use **Local Supabase with Docker** for development, then deploy to Supabase free tier or Railway for production.

---

## Next Steps

Once you have local development working:

1. ✅ Create test users
2. ✅ Create sample tickets/assets
3. ✅ Test all features
4. ✅ Make your changes
5. ✅ Deploy to production (see DEPLOYMENT.md)

For deployment options, see **DEPLOYMENT.md**
