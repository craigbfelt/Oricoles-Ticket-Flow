# 🚀 Quick Start - Running Oricol App Locally

This guide will get you up and running with the Oricol Helpdesk app in under 5 minutes!

## ⚡ Super Quick Start (Automated)

### For macOS/Linux:

```bash
./quick-start.sh
```

### For Windows:

```cmd
quick-start.bat
```

The script will:
1. ✅ Check prerequisites (Node.js, Docker)
2. ✅ Install dependencies
3. ✅ Start local Supabase (optional)
4. ✅ Create .env.local configuration
5. ✅ Launch the development server

Then open http://localhost:8080 in your browser!

---

## 📝 Manual Setup (5 Steps)

If you prefer to run commands manually:

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Local Supabase

```bash
npx supabase start
```

**Output will include:**
- API URL: `http://localhost:54321`
- anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Studio URL: `http://localhost:54323`

**⚠️ Copy the `anon key` - you'll need it next!**

### Step 3: Create .env.local

```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<paste-anon-key-here>
EOF
```

Replace `<paste-anon-key-here>` with the actual anon key from Step 2.

### Step 4: Start Development Server

```bash
npm run dev
```

### Step 5: Open in Browser

Navigate to: http://localhost:8080

🎉 **Success!** You should see the Oricol Helpdesk login page.

---

## 🖼️ Testing Iframe Embedding

After the app is running:

1. Open one of the example HTML files:
   - `examples/iframe-basic.html` - Basic embedding
   - `examples/iframe-fullscreen.html` - Full-screen embedding

2. The iframe should show the Oricol app embedded in the page.

---

## 🔑 Creating Your First Admin User

1. Click "Sign Up"
2. Use one of these pre-configured admin emails:
   - `admin@oricol.co.za`
   - `craig@zerobitone.co.za`
   - `admin@zerobitone.co.za`
3. Enter any password (remember it!)
4. Click "Sign Up"

You'll automatically get admin role! 🎉

---

## 🎨 Accessing Supabase Studio

Manage your database visually:

**URL:** http://localhost:54323

From here you can:
- View all database tables
- Run SQL queries
- Manage users
- View authentication logs
- Configure storage buckets

---

## 📧 Testing Email Features

All emails sent by the app appear in Inbucket:

**URL:** http://localhost:54324

Great for testing:
- Password reset emails
- Email verification
- Welcome emails

---

## 🛑 Stopping Services

### Stop Development Server
Press `Ctrl+C` in the terminal running `npm run dev`

### Stop Supabase
```bash
npx supabase stop
```

---

## 🔄 Restarting Services

### Restart Everything
```bash
# Stop Supabase
npx supabase stop

# Start Supabase
npx supabase start

# Start dev server
npm run dev
```

---

## 🐛 Common Issues

### "Port 8080 already in use"

**Solution:**
```bash
# Find and kill process on port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Or change port in vite.config.ts
```

### "Docker not found"

**Solution:**
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Start Docker Desktop
3. Try again

### "Cannot connect to Supabase"

**Solution:**
```bash
# Check if Supabase is running
npx supabase status

# If not, start it
npx supabase start

# Verify .env.local has correct URL
cat .env.local  # macOS/Linux
type .env.local  # Windows
```

### "Iframe not loading"

**Solution:**
1. Make sure dev server is running
2. Check iframe src URL is `http://localhost:8080`
3. Open browser console (F12) for errors

---

## 📚 Next Steps

Now that you have the app running:

1. ✅ **Explore the app** - Create tickets, manage assets
2. ✅ **Test iframe embedding** - Try the example HTML files
3. ✅ **Customize** - Modify code to fit your needs
4. ✅ **Deploy** - When ready, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📖 Detailed Documentation

- **Full local setup guide:** [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md)
- **Iframe embedding guide:** [IFRAME_EMBEDDING.md](./IFRAME_EMBEDDING.md)
- **Complete documentation:** [README.md](./README.md)
- **Deployment options:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 💡 Pro Tips

1. **Use two terminal windows:**
   - Terminal 1: `npm run dev` (app)
   - Terminal 2: `npx supabase logs -f` (logs)

2. **Quick database reset:**
   ```bash
   npx supabase db reset
   # ⚠️ WARNING: Deletes all data!
   ```

3. **Access database directly:**
   ```bash
   psql postgresql://postgres:postgres@localhost:54322/postgres
   ```

4. **View all users in database:**
   - Open http://localhost:54323
   - Navigate to Authentication → Users

---

## 🎯 What You've Achieved

✅ Local Supabase database running  
✅ Development server running  
✅ App accessible at http://localhost:8080  
✅ Database admin at http://localhost:54323  
✅ Email testing at http://localhost:54324  
✅ Ready for iframe embedding  
✅ Ready for development  

---

## ❓ Need Help?

1. Check [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md) for detailed troubleshooting
2. Check [IFRAME_EMBEDDING.md](./IFRAME_EMBEDDING.md) for embedding issues
3. Review example files in `examples/` directory
4. Open an issue on GitHub

---

## 🎉 You're All Set!

Start building! The app is running locally and ready for development or embedding in your website.

**Happy coding! 🚀**
