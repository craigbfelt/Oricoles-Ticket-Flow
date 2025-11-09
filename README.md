# Oricol Helpdesk App

A modern, professional helpdesk and asset management system built with React, TypeScript, and Supabase.

![Oricol Helpdesk](https://github.com/user-attachments/assets/43b833f0-e11c-4776-a0ad-cba268f6aa18)

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

### 🎨 User Interface
- Modern, responsive design
- Mobile-friendly with hamburger menu
- Clean sidebar navigation
- Toast notifications for user feedback
- Professional color scheme

## Project info

**URL**: https://lovable.dev/projects/c75c70a7-c13d-4879-a8af-bbb8cc076141

## Getting Started

### Prerequisites
- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account and project (included in this setup)

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/craigfelt/oricol-ticket-flow.git
   cd oricol-ticket-flow
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Environment Setup**
   
   The `.env` file is already configured with Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://kwmeqvrmtivmljujwocp.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-key>
   VITE_SUPABASE_PROJECT_ID=kwmeqvrmtivmljujwocp
   ```

4. **Start the development server**
   ```sh
   npm run dev
   ```
   
   The app will be available at http://localhost:8080

5. **Build for production**
   ```sh
   npm run build
   ```

### First Steps
1. Create an account using the sign-up form
2. Sign in with your credentials
3. Explore the dashboard
4. Create your first ticket
5. (Admin only) Manage assets

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
   - Implements app_role enum (admin, support_staff, user)
   - Updates RLS policies for role-based access
   - Adds helper function for role checking

## Security

- All tables protected with Row Level Security (RLS)
- User authentication via Supabase Auth
- Role-based access control for sensitive operations
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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c75c70a7-c13d-4879-a8af-bbb8cc076141) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
