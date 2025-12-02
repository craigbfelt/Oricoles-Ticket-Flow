# Oricol Helpdesk App

A modern, professional helpdesk and asset management system built with React, TypeScript, and Supabase.

![Oricol Helpdesk](https://github.com/user-attachments/assets/43b833f0-e11c-4776-a0ad-cba268f6aa18)

## ✅ Deployment Status

**🎯 INDEPENDENT DEPLOYMENT** - This app is now fully independent from Lovable

This app runs on:
- **GitHub**: Version control, CI/CD
- **Supabase**: Backend database (Project ID: `blhidceerkrumgxjhidq`)
- **Vercel**: Frontend hosting (linked via GitHub integration)

## 🚀 Database Setup (Post-Lovable)

**⭐ [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - **Complete database setup guide**
**⭐ [COMPLETE_DATABASE_SETUP.sql](./COMPLETE_DATABASE_SETUP.sql)** - **Run this in SQL Editor to set up all tables**

Quick setup:
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq/sql)
2. Copy contents of `COMPLETE_DATABASE_SETUP.sql`
3. Paste and click "Run"
4. Done! Your database is ready.

## 🚀 Migrate to New Vercel & Supabase Account

**⭐ [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md)** - **Complete migration guide to new accounts**

If you need to migrate this app to a new Vercel and Supabase account:
1. **In-App Migration Tracker** - Access at `/migration-tracker` for visual step-by-step progress
2. **Full Documentation** - See [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md)
3. **Required Credentials**:
   - Supabase: Project URL, Anon Key, Project ID, Access Token, DB Password
   - Vercel: Token, Org ID, Project ID

## 🚀 Working with this project

**This app runs on GitHub + Supabase** - A modern, independent tech stack:
- **GitHub**: Version control, CI/CD, and collaborative development
- **Supabase**: Backend database, authentication, and storage
- **Deployment**: Multiple free hosting options (Netlify, Vercel, GitHub Pages, Cloudflare)

### 🎯 Quick Start

**⭐ NEW: [Auto Installer](./INSTALLER_README.md)** - **One-click installation to local `lpc` folder!**  
**⭐ [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - **Database setup guide**
**⭐ [QUICKSTART_GITHUB_SUPABASE.md](./QUICKSTART_GITHUB_SUPABASE.md)** - **5-minute setup guide**  
**⭐ [GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md)** - **Complete deployment guide**  
**⭐ [IFRAME_SETUP.md](./IFRAME_SETUP.md)** - **Embed app as iframe on your website**

Choose your setup path:
1. **Auto Installer** - Automated setup to local `lpc` folder (Recommended for first-time users)
2. **Local Development** - Run everything on your computer (100% free)
3. **Cloud Deployment** - Deploy to production using free tiers
4. **Custom Setup** - Advanced configuration options

### Making Changes:
1. **Clone or fork the repository** - Get a copy on your GitHub account
2. **Make code changes** - Edit locally or on GitHub
3. **Push to GitHub** - Changes are committed to your repository
4. **Automatic deployment** - GitHub Actions builds and deploys your app
5. **Database migrations auto-deploy** - Migrations are automatically applied to Supabase on PR merge (see [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md))

### 🔄 Database Migrations (Automated!)

**✨ NEW: Automated Migration Deployment**

Database migrations are now **automatically applied** when you merge PRs to main!

**Quick Setup** (5 minutes):
1. **[AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md)** - 5-minute setup guide
2. Add Supabase secrets to GitHub
3. Done! Migrations auto-deploy on PR merge

**How it works**:
- Create migration files in `supabase/migrations/`
- Squash and merge PR to main
- GitHub Actions automatically applies migrations
- No manual deployment needed!

**Manual Options** (if needed):

Using Supabase CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
npx supabase db push
```

Without CLI:
1. Go to your Supabase project dashboard
2. Click **SQL Editor**
3. Run migration files from `supabase/migrations/` in chronological order

**All Documentation**:
- **⭐ [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md)** - **5-minute automated setup**
- **[AUTOMATED_MIGRATION_GUIDE.md](./AUTOMATED_MIGRATION_GUIDE.md)** - Complete automation guide
- **[GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Free hosting options
- **[SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)** - Complete migration guide
- **[DATABASE_DETECTION_GUIDE.md](./DATABASE_DETECTION_GUIDE.md)** - Database detection guide
- **[MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)** - Quick start guide
- **[MIGRATION_CHEATSHEET.md](./MIGRATION_CHEATSHEET.md)** - Command reference

### Additional Setup Options:
- **⭐ GitHub + Supabase Setup** - See [GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md)
- **Local Development** (optional) - See [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- **Alternative Deployment** (optional) - See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Reference** - See [QUICKSTART.md](./QUICKSTART.md)

## Features

### 🎫 Ticket Management
- Create, view, and manage support tickets
- Priority levels: Low, Medium, High, Urgent
- Status tracking: Open, In Progress, Pending, Resolved, Closed
- Category organization
- Close and delete tickets (admin only for delete)

### 📦 Asset Management
- Track company assets (laptops, monitors, printers, etc.)
- Asset tagging and categorization
- Status tracking: Active, Maintenance, Retired, Disposed
- Location and warranty information
- Admin-only access

### 👥 User Management
- Secure authentication with Supabase
- Role-based access control (Admin, Support Staff, User)
- User profiles with full name and email

### 📊 Dashboard
- Overview of ticket and asset statistics
- Recent ticket activity
- Real-time data synchronization

### 📄 Document Import
- Upload Word documents (.docx, .doc) to import data
- Automatic table extraction and parsing
- Smart field mapping for tickets, assets, and licenses
- Template downloads for easy data entry
- Import tracking and history
- **Image extraction and upload from documents**
- **Network diagram image uploads**
- See [DOCUMENT_IMPORT.md](./DOCUMENT_IMPORT.md) for detailed instructions

### 🏢 CRM (Customer Relationship Management)
- Manage companies and organizations
- Track contacts and their relationships
- Sales pipeline and deal management
- Activity logging (calls, emails, meetings, tasks)
- Admin-only access
- **⚠️ First-time setup required** - See [CRM_SETUP_GUIDE.md](./CRM_SETUP_GUIDE.md)

### 🎨 User Interface
- Modern, responsive design
- Mobile-friendly with hamburger menu
- Clean sidebar navigation
- Toast notifications for user feedback
- Professional color scheme

## Project info

**Repository**: https://github.com/craigfelt/oricol-ticket-flow-4084ab4c

This is an independent application that can be deployed to any hosting platform.

## Getting Started

### 🚀 Quick Start Options

**Choose your setup:**

1. **🚀 Auto Installer** (⭐ Recommended for first-time users)
   - One-click automated installation
   - Clones repository to local `lpc` folder
   - Automatically installs all dependencies
   - See [INSTALLER_README.md](./INSTALLER_README.md) for details
   - Download: [Windows](./install.ps1) | [Windows Batch](./install.bat) | [macOS/Linux](./install.sh)

2. **💰 $0 Cost - Local Development** (Recommended for testing)
   - Run 100% free on your computer
   - See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for step-by-step guide
   - Uses Docker to run Supabase locally

3. **☁️ $0 Cost - Cloud Free Tier** (Recommended for production)
   - Use Supabase free tier (500MB database, no credit card required)
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for all free hosting options
   - Deploy to Netlify, Vercel, or Cloudflare Pages (all free)

### Prerequisites
- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **For local development**: [Docker Desktop](https://www.docker.com/products/docker-desktop) (free)
- **For cloud development**: Free Supabase account at [supabase.com](https://supabase.com)

### 🚀 Auto Installer (New!)

The easiest way to get started! Download and run the installer for your operating system:

**Windows (PowerShell):**
```powershell
# Download and run
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/craigfelt/oricol-ticket-flow-c5475242/main/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

**Windows (Batch):**
- Download `install.bat` and double-click to run

**macOS/Linux:**
```bash
# Download and run
curl -O https://raw.githubusercontent.com/craigfelt/oricol-ticket-flow-c5475242/main/install.sh
chmod +x install.sh
./install.sh
```

**What it does:**
- ✅ Checks for Git, Node.js, and npm
- ✅ Clones repository to local `lpc` folder
- ✅ Installs all dependencies automatically
- ✅ Creates `.env` configuration file
- ✅ Provides clear next steps

See [INSTALLER_README.md](./INSTALLER_README.md) for detailed documentation.

### Quick Installation (Cloud - Supabase Free Tier)

1. **Clone the repository**
   ```sh
   git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
   cd oricol-ticket-flow-34e64301
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
   VITE_SUPABASE_PROJECT_ID=<your-project-id>
   ```
   
   Get these from your free Supabase project at [supabase.com](https://supabase.com)

4. **Apply Database Migrations**
   ```sh
   npm run migrate
   ```
   
   This applies all database schema changes. See [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) for details.

5. **Start the development server**
   ```sh
   npm run dev
   ```
   
   The app will be available at http://localhost:8080

6. **Build for production**
   ```sh
   npm run build
   ```

### Quick Installation (Local - 100% Free, No Cloud)

1. **Clone and install**
   ```sh
   git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
   cd oricol-ticket-flow-34e64301
   npm install
   ```

2. **Start local Supabase** (requires Docker)
   ```sh
   npx supabase start
   ```
   
   This will output your local credentials including the anon key

3. **Create `.env.local`**
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-step-2>
   ```

4. **Start the app**
   ```sh
   npm run dev
   ```
   
   The app will be available at http://localhost:8080
   
   Access Supabase Studio (database admin) at http://localhost:54323

For detailed instructions, see:
- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Complete local development guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Free hosting and deployment options
- **[ADMIN_ACCOUNT_SETUP.md](./ADMIN_ACCOUNT_SETUP.md)** - Create admin account with full permissions

### First Steps
1. Create an account using the sign-up form
2. Sign in with your credentials
3. Explore the dashboard
4. Create your first ticket
5. (Admin only) Manage assets

### Admin Account Setup
If you need to create an admin account or have lost access to your admin account:
- See **[ADMIN_ACCOUNT_SETUP.md](./ADMIN_ACCOUNT_SETUP.md)** for detailed instructions
- Pre-configured admin emails that automatically get admin role:
  - `craig@zerobitone.co.za`
  - `admin@oricol.co.za`
  - `admin@zerobitone.co.za`

### Troubleshooting "Access Denied" Errors
If you can see tabs but get "Access Denied" when clicking them:
- **Quick Fix:** See **[QUICK_FIX_ACCESS_DENIED.md](./QUICK_FIX_ACCESS_DENIED.md)** for instant solution
- **Detailed Guide:** See **[FIXING_ACCESS_DENIED.md](./FIXING_ACCESS_DENIED.md)** for comprehensive troubleshooting

### Troubleshooting CRM Errors
If you see "Failed to load CRM data" error:
- **⚡ SOLUTION:** See **[CRM_SETUP_GUIDE.md](./CRM_SETUP_GUIDE.md)** for setup instructions
- The CRM database tables need to be created first (one-time setup)
- Works for both CLI and Lovable users

### Troubleshooting Storage and RLS Errors
If you encounter storage-related errors when uploading files:

**"new row violates row-level security policy"**:
- **⚡ START HERE:** See **[QUICKFIX_START_HERE.md](./QUICKFIX_START_HERE.md)** for 2-minute fix
- **Complete Guide:** See **[COMPLETE_FIX_GUIDE.md](./COMPLETE_FIX_GUIDE.md)** for detailed instructions
- **SQL Fix Script:** Run **[FIX_RLS_NOW.sql](./FIX_RLS_NOW.sql)** in Supabase SQL Editor
- **Verification:** Use **[VERIFY_FIX.sql](./VERIFY_FIX.sql)** to check if fix was applied
- **Background Info:** See **[SUPABASE_STORAGE_RLS_GUIDE.md](./SUPABASE_STORAGE_RLS_GUIDE.md)** for technical details

**"bucket not found" errors**:
- **Solution:** See **[STORAGE_BUCKET_FIX.md](./STORAGE_BUCKET_FIX.md)** for migration instructions
- This affects image uploads in:
  - Company Network Diagrams
  - Branch Details
  - Document Import
  - Nymbis RDP Cloud

**Bypassing RLS for trusted server-side operations**:
- **Advanced Guide:** See **[BYPASS_ACCESS_CONTROLS_GUIDE.md](./BYPASS_ACCESS_CONTROLS_GUIDE.md)** for using service keys to bypass RLS policies
- Use this when you need unrestricted storage access from Edge Functions or backend services
- ⚠️ **Security Warning:** Only use in trusted server environments, never expose service keys to client-side code

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE locally**

Clone the repository and make changes locally:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/craigfelt/oricol-ticket-flow-4084ab4c.git

# Step 2: Navigate to the project directory.
cd oricol-ticket-flow-4084ab4c

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technology Stack

This project is built with modern, production-ready technologies:

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - High-quality React components
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Lucide React** - Beautiful icon library

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication and user management
  - Row Level Security (RLS) policies
  - Real-time subscriptions

### Database Schema
- **profiles** - User profile information
- **user_roles** - Role-based access control
- **tickets** - Support ticket management
- **assets** - Asset tracking
- **ticket_comments** - Ticket conversation history

## Project Structure

```
oricol-ticket-flow/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn-ui components
│   │   └── DashboardLayout.tsx  # Main layout with sidebar
│   ├── pages/
│   │   ├── Auth.tsx         # Authentication page
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Tickets.tsx      # Ticket management
│   │   └── Assets.tsx       # Asset management
│   ├── integrations/
│   │   └── supabase/        # Supabase client configuration
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   └── App.tsx              # Main app component with routing
├── supabase/
│   └── migrations/          # Database schema migrations
├── public/                  # Static assets
└── package.json             # Dependencies and scripts
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Migrations
- `npm run migrate` - Apply pending migrations (interactive)
- `npm run migrate:status` - Check migration status
- `npm run migrate:apply` - Apply pending migrations
- `npm run migrate:new [name]` - Create new migration file

### Supabase CLI
- `npm run supabase:start` - Start local Supabase instance
- `npm run supabase:stop` - Stop local Supabase instance
- `npm run supabase:status` - Check local Supabase status
- `npm run supabase:link` - Link to remote Supabase project

**📖 For complete migration guide, see [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)**

## Database Migrations

The application includes two migrations:

1. **Initial Schema** (20251108052000)
   - Creates tables: profiles, tickets, assets, ticket_comments
   - Sets up enum types for status and priority
   - Implements Row Level Security policies
   - Creates triggers for automatic timestamps

2. **Role-Based Access** (20251109045855)
   - Adds user_roles table
   - Implements app_role enum (admin, ceo, support_staff, user)
   - Updates RLS policies for role-based access
   - Adds helper function for role checking

3. **Admin Account Setup** (20251112170113)
   - Auto-assigns admin role to admin@oricol.co.za
   - Ensures admin permissions are properly configured
   - See [ADMIN_ACCOUNT_SETUP.md](./ADMIN_ACCOUNT_SETUP.md) for details

4. **Storage Bucket Setup** (20251113111200)
   - Creates 'diagrams' storage bucket for image uploads
   - Enables image uploads for network diagrams, documents, and more
   - Sets up RLS policies for secure image storage
   - See [STORAGE_BUCKET_FIX.md](./STORAGE_BUCKET_FIX.md) for details

## Security

- All tables protected with Row Level Security (RLS)
- User authentication via Supabase Auth
- Role-based access control for sensitive operations
- Four-tier permission system:
  - **admin**: Full access to everything including System Users management
  - **ceo**: Full access except System Users management
  - **support_staff**: Access to tickets, users, reports, VPN, RDP, remote support
  - **user**: Basic access to tickets and remote support only
- Secure data access policies:
  - Users can only see their own tickets or assigned tickets
  - Support staff and admins can see all tickets
  - Only admins can manage assets
  - Only admins can delete tickets

## Screenshots

### Authentication
![Sign In Page](https://github.com/user-attachments/assets/43b833f0-e11c-4776-a0ad-cba268f6aa18)

### Sign Up
![Sign Up Page](https://github.com/user-attachments/assets/c8d1ecbe-9a8f-4b62-9e9c-ee3f04204d11)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is part of the Oricol ES helpdesk system.

## Support

For support, please create a ticket in the system or contact the development team.

## Deployment

### 🆓 Free Deployment Options

You can deploy this app **completely free** using various hosting platforms:

#### Backend Options (Database + API)
- **Supabase Free Tier** - 500MB database, unlimited API requests
- **Local Supabase on Docker** - 100% free, self-hosted

#### Frontend Options
- **GitHub Pages** - Built-in GitHub hosting
- **Netlify** - 100GB bandwidth/month
- **Vercel** - 100GB bandwidth/month
- **Cloudflare Pages** - Unlimited bandwidth

**See [GITHUB_SUPABASE_DEPLOYMENT.md](./GITHUB_SUPABASE_DEPLOYMENT.md) for complete deployment instructions.**

### Continuous Deployment with GitHub Actions

The repository includes automated workflows for:
- **CI/CD**: Automatic builds and tests on every push
- **GitHub Pages**: Automatic deployment to GitHub Pages
- **Netlify**: Automatic deployment to Netlify (requires secrets)

See `.github/workflows/` for workflow configurations.
