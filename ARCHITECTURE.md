# Architecture Overview - Self-Hosted Supabase

This document provides a visual overview of the self-hosted Supabase architecture for the Oricol Helpdesk application.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│                     http://localhost:8080                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Vite Dev Server│
                    │   (Frontend)   │
                    │   React + TS   │
                    └────────┬───────┘
                             │
                             │ API Calls
                             ▼
          ┌──────────────────────────────────────────┐
          │         Kong API Gateway                 │
          │       http://localhost:8000              │
          │  (Routes & Authentication Middleware)    │
          └──────────┬───────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┬──────────┐
        │            │            │              │          │
        ▼            ▼            ▼              ▼          ▼
   ┌────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐
   │  Auth  │  │   REST  │  │Realtime │  │ Storage  │  │  Meta  │
   │GoTrue  │  │PostgREST│  │         │  │          │  │        │
   │:9999   │  │  :3000  │  │  :4000  │  │  :5000   │  │ :8080  │
   └───┬────┘  └────┬────┘  └────┬────┘  └─────┬────┘  └────┬───┘
       │            │            │             │            │
       │            │            │             │            │
       └────────────┴────────────┴─────────────┴────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    PostgreSQL 15       │
                    │    Database Server     │
                    │      localhost:5432    │
                    └────────────────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │                        │
                    ▼                        ▼
          ┌──────────────────┐    ┌──────────────────┐
          │  postgres-data   │    │  storage-data    │
          │  Docker Volume   │    │  Docker Volume   │
          └──────────────────┘    └──────────────────┘
```

## 📦 Service Details

### Frontend Layer

**Vite Development Server** (Port 8080)
- React 18 application
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Connects to API Gateway

### API Gateway Layer

**Kong** (Port 8000)
- Routes incoming requests
- JWT authentication
- CORS handling
- API key validation
- Load balancing

### Application Services Layer

**1. GoTrue - Authentication** (Port 9999)
```
Responsibilities:
├── User registration
├── Login/logout
├── Password reset
├── Email verification
├── JWT token generation
└── Session management
```

**2. PostgREST - REST API** (Port 3000)
```
Responsibilities:
├── Auto-generated REST API from DB schema
├── Query the database
├── Row Level Security (RLS) enforcement
├── JSON responses
└── OpenAPI documentation
```

**3. Realtime** (Port 4000)
```
Responsibilities:
├── WebSocket connections
├── Real-time data subscriptions
├── Database change notifications
├── Presence tracking
└── Broadcast messaging
```

**4. Storage API** (Port 5000)
```
Responsibilities:
├── File uploads
├── File downloads
├── Image transformations (via imgproxy)
├── Access control
└── Bucket management
```

**5. Meta API** (Port 8080)
```
Responsibilities:
├── Database metadata
├── Schema information
├── Used by Studio UI
└── Migration management
```

### Database Layer

**PostgreSQL 15**
```
Database Objects:
├── Tables
│   ├── profiles
│   ├── user_roles
│   ├── tickets
│   ├── assets
│   ├── ticket_comments
│   ├── documents
│   ├── network_diagrams
│   └── ...
├── Functions
├── Triggers
├── RLS Policies
└── Extensions
```

### Supporting Services

**Supabase Studio** (Port 3000)
- Web-based database UI
- Table editor
- SQL editor
- API documentation
- Authentication management

**Inbucket - Mail Server** (Port 9000)
- SMTP server (Port 2500)
- Email testing UI
- Development emails
- No external dependencies

**imgproxy** (Port 5001)
- Image transformation
- Resize, crop, optimize
- WebP conversion
- Used by Storage API

**Vector** (Optional)
- Log aggregation
- Metrics collection
- Forwarding to Logflare

## 🔄 Request Flow

### 1. User Login Flow

```
Browser → Frontend → Kong → GoTrue → PostgreSQL
  │                              │
  │                              ▼
  │                         Verify credentials
  │                              │
  │◄─────────────────────────────┘
  │         JWT Token
  │
  └──────► Store token in localStorage
```

### 2. Data Query Flow

```
Browser → Frontend → Kong → PostgREST → PostgreSQL
  │                   │
  │                   └──► Validate JWT
  │                         Check RLS
  │                              │
  │                              ▼
  │                         Execute query
  │                              │
  │◄─────────────────────────────┘
           JSON response
```

### 3. File Upload Flow

```
Browser → Frontend → Kong → Storage → PostgreSQL
  │                   │         │
  │                   │         └──► Check bucket policy
  │                   │         │
  │                   │         ▼
  │                   │     Save file to volume
  │                   │         │
  │                   └─────────┤
  │                             │
  │                             ▼
  │                      Transform (imgproxy)
  │                             │
  │◄────────────────────────────┘
         File URL response
```

### 4. Real-time Subscription Flow

```
Browser → Frontend → Kong → Realtime ─┐
  │                                    │
  │                                    ▼
  │                              PostgreSQL
  │                                    │
  │                                    │ LISTEN/NOTIFY
  │                                    │
  │                                    ▼
  │◄────────────── WebSocket ──── Realtime
        Real-time updates
```

## 💾 Data Persistence

### Volumes

**postgres-data**
```
Stores:
├── Database files
├── WAL logs
├── Configuration
└── Extensions
```

**storage-data**
```
Stores:
├── diagrams/
│   └── network diagram images
├── documents/
│   └── uploaded documents
└── (other buckets)
```

## 🔐 Security Layers

```
┌─────────────────────────────────────┐
│  1. Network Layer                   │
│     - Firewall                      │
│     - SSL/TLS (in production)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  2. API Gateway (Kong)              │
│     - JWT validation                │
│     - API key checking              │
│     - Rate limiting                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  3. Application Layer               │
│     - Service authentication        │
│     - Business logic                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  4. Database Layer                  │
│     - Row Level Security (RLS)      │
│     - User roles                    │
│     - Access policies               │
└─────────────────────────────────────┘
```

## 🔄 Backup Strategy

```
Automated Backup (Daily)
        │
        ▼
┌──────────────────┐
│  Backup Script   │
│ (scripts/backup) │
└────────┬─────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐  ┌──────────┐
│  DB    │  │ Storage  │
│ Dump   │  │  Files   │
└───┬────┘  └─────┬────┘
    │             │
    └──────┬──────┘
           ▼
    ┌──────────────┐
    │   backups/   │
    │ - timestamp  │
    │ - .sql       │
    │ - .tar.gz    │
    └──────────────┘
```

## 📊 Monitoring Points

```
┌──────────────────────────────────┐
│  Service Health Checks           │
│                                  │
│  ✓ PostgreSQL: pg_isready        │
│  ✓ Auth: /health endpoint        │
│  ✓ Storage: /status endpoint     │
│  ✓ Kong: API calls               │
│  ✓ Studio: HTTP GET              │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Resource Monitoring             │
│                                  │
│  • CPU usage                     │
│  • Memory usage                  │
│  • Disk space                    │
│  • Network traffic               │
│  • Container status              │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Application Metrics             │
│                                  │
│  • API response times            │
│  • Error rates                   │
│  • Active connections            │
│  • Database queries              │
│  • Storage usage                 │
└──────────────────────────────────┘
```

## 🚀 Scaling Strategy

### Vertical Scaling
```
Increase resources:
├── CPU cores
├── RAM
├── Disk space
└── Network bandwidth
```

### Horizontal Scaling (Advanced)
```
Load Balancer
      │
      ├── PostgREST (x3)
      ├── GoTrue (x2)
      ├── Storage (x2)
      └── Realtime (x2)
           │
           ▼
    PostgreSQL Primary
           │
      ┌────┴────┐
      ▼         ▼
   Replica  Replica
```

## 🌐 Production Deployment

```
Internet
   │
   ▼
┌──────────────┐
│ Load Balancer│
│   (nginx)    │
└──────┬───────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
Frontend  API Gateway
  :80      :8000
  │         │
  └────┬────┘
       │
       ▼
  Docker Compose
  (All services)
```

## 📝 Configuration Flow

```
.env.example
     │
     ▼
   .env (created by user)
     │
     ▼
docker-compose.yml
     │
     ▼
Environment Variables
     │
     ├──► PostgreSQL
     ├──► Auth Service
     ├──► Kong
     ├──► Storage
     └──► Other services
```

## 🔧 Management Commands

```
User Terminal
     │
     ├──► scripts/setup.sh
     │      └──► Initial deployment
     │
     ├──► scripts/backup.sh
     │      └──► Create backups
     │
     ├──► scripts/restore.sh
     │      └──► Restore data
     │
     ├──► make <command>
     │      └──► Quick operations
     │
     └──► docker compose <command>
            └──► Direct control
```

## 📖 Documentation Map

```
User Needs
    │
    ├── "How do I get started?"
    │      └──► SELF_HOSTED_SETUP.md
    │
    ├── "How do I migrate from cloud?"
    │      └──► MIGRATION_GUIDE.md
    │
    ├── "What commands do I use daily?"
    │      └──► QUICK_REFERENCE.md
    │
    ├── "Which setup should I choose?"
    │      └──► INSTALLATION_OPTIONS.md
    │
    └── "How does it all work?"
           └──► ARCHITECTURE.md (this file)
```

## 🎯 Key Takeaways

1. **Kong** acts as the single entry point for all API requests
2. **Services are isolated** in their own containers
3. **Data persists** in Docker volumes
4. **PostgreSQL** is the central data store
5. **All services communicate** through the Docker network
6. **Security** is enforced at multiple layers
7. **Backups** are automated and timestamped
8. **Scaling** can be vertical or horizontal

## 🔗 Related Documentation

- [SELF_HOSTED_SETUP.md](./SELF_HOSTED_SETUP.md) - Setup guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration steps
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command reference
- [INSTALLATION_OPTIONS.md](./INSTALLATION_OPTIONS.md) - Deployment comparison
