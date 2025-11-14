# Local Development Guide - Oricol Helpdesk App

This guide will help you run the Oricol Helpdesk app locally on your computer and configure it for iframe embedding in your website.

## 🎯 What You'll Achieve

By following this guide, you will:
1. ✅ Run the Oricol app locally on your computer
2. ✅ Connect it to a local Supabase database
3. ✅ Embed the app in your website using an iframe
4. ✅ Configure CORS and security settings properly

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/) or install with [nvm](https://github.com/nvm-sh/nvm)
- **Docker Desktop** - [Download from docker.com](https://www.docker.com/products/docker-desktop)
- **Git** - [Download from git-scm.com](https://git-scm.com/)
- **Text Editor** - VS Code, Sublime Text, or your preferred editor

### System Requirements
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- macOS, Windows 10/11, or Linux

---

## 🚀 Step-by-Step Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git

# Navigate to the project directory
cd oricol-ticket-flow-34e64301

# Install dependencies
npm install
```

**Expected output:**
```
added 419 packages in 15s
✓ PDF.js worker file copied successfully
```

---

### Step 2: Start Local Supabase

The app currently uses cloud Supabase. To run it locally, you need to start a local Supabase instance:

```bash
# Start local Supabase (this will download Docker images on first run)
npx supabase start
```

**First time setup (5-10 minutes):**
- Downloads Supabase Docker images (~2GB)
- Starts PostgreSQL, GoTrue (Auth), PostgREST (API), and more
- Automatically applies database migrations

**Expected output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Important:** Copy the `anon key` from the output - you'll need it in the next step!

---

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root with your local Supabase credentials:

```bash
# Create .env.local file
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
EOF
```

**Note:** Replace the `VITE_SUPABASE_PUBLISHABLE_KEY` with the actual `anon key` from Step 2 if different.

**File priorities:**
- `.env.local` - Used for local development (highest priority)
- `.env` - Contains cloud Supabase credentials (ignored when .env.local exists)

---

### Step 4: Start the Development Server

```bash
# Start the Vite development server
npm run dev
```

**Expected output:**
```
  VITE v5.4.19  ready in 1234 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.1.100:8080/
  ➜  press h + enter to show help
```

---

### Step 5: Access the Application

Open your browser and navigate to:

🌐 **Application:** http://localhost:8080

You should see the Oricol Helpdesk login page!

**Other useful URLs:**
- 🎨 **Supabase Studio (Database Admin):** http://localhost:54323
- 📧 **Email Testing (Inbucket):** http://localhost:54324

---

### Step 6: Create Your First User

1. Navigate to http://localhost:8080
2. Click on "Sign Up"
3. Enter your details:
   - Full Name: Your Name
   - Email: admin@oricol.co.za (or any email)
   - Password: Choose a secure password
4. Click "Sign Up"

**Note:** The email `admin@oricol.co.za` is pre-configured to get admin role automatically. Other admin emails:
- `craig@zerobitone.co.za`
- `admin@zerobitone.co.za`

---

## 🖼️ Embedding in Your Website Iframe

Now that the app is running locally, you can embed it in your website using an iframe.

### Basic Iframe Example

Create an HTML file (e.g., `test-embed.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oricol Helpdesk - Embedded</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .iframe-wrapper {
            position: relative;
            width: 100%;
            height: 80vh;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎫 Oricol Helpdesk</h1>
        <div class="iframe-wrapper">
            <iframe 
                src="http://localhost:8080" 
                title="Oricol Helpdesk"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            ></iframe>
        </div>
    </div>
</body>
</html>
```

**To test:**
1. Save the file as `test-embed.html`
2. Open it in your browser using `file://` protocol
3. The Oricol app should appear embedded in the iframe

---

### Responsive Iframe Example

For better mobile support:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oricol Helpdesk - Responsive Embed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        .header {
            background: #fff;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            color: #2563eb;
            font-size: 1.5rem;
        }
        .iframe-container {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 1rem;
        }
        .iframe-wrapper {
            width: 100%;
            height: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        @media (max-width: 768px) {
            .header {
                padding: 0.75rem 1rem;
            }
            .header h1 {
                font-size: 1.25rem;
            }
            .iframe-container {
                top: 60px;
                padding: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 Oricol Helpdesk System</h1>
    </div>
    <div class="iframe-container">
        <div class="iframe-wrapper">
            <iframe 
                src="http://localhost:8080"
                title="Oricol Helpdesk Application"
                allow="clipboard-read; clipboard-write; fullscreen"
                loading="lazy"
            ></iframe>
        </div>
    </div>
</body>
</html>
```

---

### WordPress Integration Example

If you're using WordPress, add this to a page or post:

```html
<div style="width: 100%; height: 800px; max-width: 1400px; margin: 0 auto;">
    <iframe 
        src="http://localhost:8080" 
        style="width: 100%; height: 100%; border: 1px solid #ddd; border-radius: 8px;"
        title="Oricol Helpdesk"
        allow="clipboard-read; clipboard-write"
    ></iframe>
</div>
```

**Note:** For production, replace `http://localhost:8080` with your actual domain.

---

## 🔒 Security Considerations

### Important Security Notes:

1. **Local Development Only:**
   - `http://localhost:8080` only works on your computer
   - Not accessible from other devices on your network by default

2. **For Production Deployment:**
   - Use HTTPS (not HTTP)
   - Deploy to a proper hosting platform (Netlify, Vercel, etc.)
   - Update iframe src to use your production URL
   - Configure proper CORS headers

3. **Iframe Sandbox Attributes:**
   ```html
   sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
   ```
   - `allow-same-origin` - Required for authentication
   - `allow-scripts` - Required for React app
   - `allow-forms` - Required for ticket submission
   - `allow-popups` - Required for certain modals
   - `allow-modals` - Required for dialogs

---

## 🔧 Common Tasks

### Stopping Services

```bash
# Stop the development server
# Press Ctrl+C in the terminal running npm run dev

# Stop local Supabase
npx supabase stop
```

### Restarting Services

```bash
# Restart local Supabase
npx supabase restart

# Or stop and start
npx supabase stop
npx supabase start
```

### Viewing Logs

```bash
# View Supabase logs
npx supabase logs

# View specific service logs
npx supabase logs auth
npx supabase logs db
```

### Resetting Database

```bash
# WARNING: This deletes all data and resets to initial state
npx supabase db reset
```

### Checking Status

```bash
# Check which services are running
npx supabase status
```

---

## 🐛 Troubleshooting

### Issue: "Port 8080 already in use"

**Solution:**
```bash
# Find what's using port 8080
lsof -i :8080  # Mac/Linux
netstat -ano | findstr :8080  # Windows

# Kill the process or change the port in vite.config.ts
```

### Issue: "Docker not found"

**Solution:**
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Start Docker Desktop
3. Wait for Docker to fully start (check system tray icon)
4. Try `npx supabase start` again

### Issue: "Cannot connect to Supabase"

**Solution:**
```bash
# Check if Supabase is running
npx supabase status

# If not running, start it
npx supabase start

# Verify .env.local has correct URL
cat .env.local
```

### Issue: "Migrations failed"

**Solution:**
```bash
# Reset database and reapply migrations
npx supabase db reset
```

### Issue: "Iframe not loading"

**Possible causes:**
1. Development server not running - Run `npm run dev`
2. Wrong URL in iframe src - Check it matches http://localhost:8080
3. Browser blocking iframe - Check console for errors
4. CORS issues - Should not occur with localhost

### Issue: "Out of memory / Docker errors"

**Solution:**
1. Increase Docker memory limit:
   - Docker Desktop → Settings → Resources → Memory
   - Set to at least 4GB (8GB recommended)
2. Close other Docker containers
3. Restart Docker Desktop

---

## 📊 Accessing Supabase Studio

Supabase Studio is a web-based database management interface:

**URL:** http://localhost:54323

**What you can do:**
- ✅ View and edit database tables
- ✅ Run SQL queries
- ✅ Manage users and authentication
- ✅ View API logs
- ✅ Test RLS policies
- ✅ Manage storage buckets

**Common tasks in Studio:**

1. **View all users:**
   - Navigate to Authentication → Users

2. **View tickets:**
   - Navigate to Table Editor → tickets

3. **Run SQL:**
   - Navigate to SQL Editor
   - Write and execute queries

4. **Check user roles:**
   - Navigate to Table Editor → user_roles

---

## 🚀 Next Steps

Now that you have the app running locally:

1. ✅ Test the embedded iframe in your website
2. ✅ Create test tickets and users
3. ✅ Customize the app for your needs
4. ✅ When ready, deploy to production (see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## 📚 Additional Resources

- **Full Documentation:** [README.md](./README.md)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Reference:** [QUICKSTART.md](./QUICKSTART.md)
- **Iframe Embedding Details:** [IFRAME_EMBEDDING.md](./IFRAME_EMBEDDING.md)
- **Architecture Overview:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 💡 Pro Tips

1. **Use two terminal windows:**
   - Terminal 1: `npm run dev` (app)
   - Terminal 2: `npx supabase logs -f` (logs)

2. **Database changes:**
   - Use Supabase Studio (http://localhost:54323) for quick edits
   - Create migrations for permanent changes

3. **Development workflow:**
   - Make changes to code
   - App hot-reloads automatically (no restart needed)
   - Check browser console for errors

4. **Testing emails:**
   - All auth emails appear in Inbucket (http://localhost:54324)
   - Great for testing password reset, email verification, etc.

---

## ❓ FAQ

**Q: Do I need to pay for anything?**
A: No! Running locally is completely free.

**Q: Can others access my local app?**
A: Not by default. It only runs on http://localhost:8080. For network access, see "Accessing from other devices" section in [LOCAL_SETUP.md](./LOCAL_SETUP.md).

**Q: How do I deploy to production?**
A: See [DEPLOYMENT.md](./DEPLOYMENT.md) for free hosting options on Netlify, Vercel, or Cloudflare Pages.

**Q: Can I switch back to cloud Supabase?**
A: Yes! Just delete `.env.local` and the app will use the cloud credentials from `.env`.

**Q: Is this production-ready?**
A: The app is production-ready, but local Supabase is for development only. Deploy to Supabase Cloud or self-host for production.

---

## 🎉 Success!

You now have the Oricol Helpdesk app running locally and embedded in an iframe. Happy developing! 🚀
