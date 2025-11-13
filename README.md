# Oricol Helpdesk App

A modern, professional helpdesk and asset management system built with React, TypeScript, and Supabase.

![Oricol Helpdesk](https://github.com/user-attachments/assets/43b833f0-e11c-4776-a0ad-cba268f6aa18)

## 🚀 Working with this project

**This app runs on Lovable** - All code changes sync automatically between GitHub and Lovable.

### Making Changes:
1. **Edit code on GitHub** - Make changes here and commit them
2. **Lovable syncs automatically** - Your changes appear in Lovable
3. **App updates live** - The app running on Lovable updates with your changes

### Additional Setup Options:
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

### 🎨 User Interface
- Modern, responsive design
- Mobile-friendly with hamburger menu
- Clean sidebar navigation
- Toast notifications for user feedback
- Professional color scheme

## Project info

**URL**: https://lovable.dev/projects/c75c70a7-c13d-4879-a8af-bbb8cc076141

## Getting Started

### 🚀 Quick Start Options

**Choose your setup:**

1. **💰 $0 Cost - Local Development** (Recommended for testing)
   - Run 100% free on your computer
   - See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for step-by-step guide
   - Uses Docker to run Supabase locally

2. **☁️ $0 Cost - Cloud Free Tier** (Recommended for production)
   - Use Supabase free tier (500MB database, no credit card required)
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for all free hosting options
   - Deploy to Netlify, Vercel, or Cloudflare Pages (all free)

### Prerequisites
- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **For local development**: [Docker Desktop](https://www.docker.com/products/docker-desktop) (free)
- **For cloud development**: Free Supabase account at [supabase.com](https://supabase.com)

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

4. **Start the development server**
   ```sh
   npm run dev
   ```
   
   The app will be available at http://localhost:8080

5. **Build for production**
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

### Troubleshooting "Bucket Not Found" Errors
If you get "bucket not found" when uploading images:
- **Solution:** See **[STORAGE_BUCKET_FIX.md](./STORAGE_BUCKET_FIX.md)** for migration instructions
- This affects image uploads in:
  - Company Network Diagrams
  - Branch Details
  - Document Import
  - Nymbis RDP Cloud

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c75c70a7-c13d-4879-a8af-bbb8cc076141) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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
- **Supabase Free Tier** - 500MB database, unlimited API requests ([guide](./DEPLOYMENT.md#option-1-free-supabase-tier-recommended-for-beginners))
- **Railway.app Free Tier** - 500 hours/month, PostgreSQL included ([guide](./DEPLOYMENT.md#railwayapp-free-tier))
- **Render.com Free Tier** - Free PostgreSQL + web service ([guide](./DEPLOYMENT.md#rendercom-free-tier))
- **Local Supabase on Docker** - 100% free, self-hosted ([guide](./LOCAL_SETUP.md))

#### Frontend Options
- **Netlify** - 100GB bandwidth/month ([guide](./DEPLOYMENT.md#1-netlify-free-tier))
- **Vercel** - 100GB bandwidth/month ([guide](./DEPLOYMENT.md#2-vercel-free-tier---no-premium-required))
- **Cloudflare Pages** - Unlimited bandwidth ([guide](./DEPLOYMENT.md#4-cloudflare-pages-free))
- **GitHub Pages** - Free static hosting ([guide](./DEPLOYMENT.md#1-github-pages-static-hosting))

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

### How can I deploy this project via Lovable?

Simply open [Lovable](https://lovable.dev/projects/c75c70a7-c13d-4879-a8af-bbb8cc076141) and click on Share -> Publish.

### Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
