# ✅ Database Setup Complete - Next Steps

Congratulations! The SQL setup has been run successfully on Supabase. Here's exactly what needs to happen next.

## 📋 Quick Status Check

| Step | Status | Action Required |
|------|--------|-----------------|
| ✅ **Database Schema** | Complete | SQL ran successfully |
| ⏳ **Storage Buckets** | May need setup | Verify or create below |
| ⏳ **Vercel Environment Variables** | Required | Set up in Vercel dashboard |
| ⏳ **GitHub Secrets** | Optional | For CI/CD automation |

---

## 🗄️ Step 1: Verify Storage Buckets (5 minutes)

After running the SQL, verify that storage buckets were created:

### Check in Supabase Dashboard:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq)
2. Click **Storage** in the sidebar
3. Verify these buckets exist:
   - `diagrams` (public)
   - `documents` (public)

### If buckets are missing, run this SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('diagrams', 'diagrams', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
```

---

## 🚀 Step 2: Set Up Vercel (Required - 10 minutes)

### Option A: Connect via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Navigate to [vercel.com](https://vercel.com)
   - Sign in with GitHub (or create account)

2. **Import Repository**
   - Click **"Add New..."** → **"Project"**
   - Select the `oricol-ticket-flow` repository
   - Click **"Import"**

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables** (Critical!)
   
   In Vercel project → **Settings** → **Environment Variables**, add:

   | Variable Name | Value | Where to Find |
   |--------------|-------|---------------|
   | `VITE_SUPABASE_URL` | `https://blhidceerkrumgxjhidq.supabase.co` | Supabase → Settings → API |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon/public key | Supabase → Settings → API → anon public |
   | `VITE_SUPABASE_PROJECT_ID` | `blhidceerkrumgxjhidq` | Supabase → Settings → General |

   **Important**: Set these for **all environments** (Production, Preview, Development)

5. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete (~2-3 minutes)
   - Note your deployment URL (e.g., `https://your-project.vercel.app`)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (will prompt for environment)
vercel

# For production deployment
vercel --prod
```

When prompted, set the environment variables as shown above.

---

## 🔑 Step 3: Get Your Supabase Credentials

### Finding Your API Keys:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq)
2. Click **Settings** (gear icon) → **API**
3. Copy these values:

| Setting | Value |
|---------|-------|
| **Project URL** | `https://blhidceerkrumgxjhidq.supabase.co` |
| **anon public key** | Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| **Project ID** | `blhidceerkrumgxjhidq` |

⚠️ **Never share or expose your `service_role` key** - it has full database access!

---

## 🔄 Step 4: GitHub Secrets for Automation (Optional)

If you want automatic deployments when you push code:

### Required GitHub Secrets:

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `SUPABASE_ACCESS_TOKEN` | Get from [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens) | Allows CI/CD to deploy migrations |
| `SUPABASE_DB_PASSWORD` | Your database password (set when creating project) | For migration authentication |
| `VERCEL_TOKEN` | Get from [Vercel Tokens](https://vercel.com/account/tokens) | For automated Vercel deployments |
| `VERCEL_ORG_ID` | Found in Vercel project settings | Required for CI/CD |
| `VERCEL_PROJECT_ID` | Found in Vercel project settings | Required for CI/CD |
| `VITE_SUPABASE_URL` | `https://blhidceerkrumgxjhidq.supabase.co` | For CI/CD builds |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key | For CI/CD builds |
| `VITE_SUPABASE_PROJECT_ID` | `blhidceerkrumgxjhidq` | For CI/CD builds |

### Finding Vercel IDs:

1. Go to your Vercel project
2. Click **Settings** → **General**
3. Scroll to find:
   - **Project ID**: Listed under "Project ID"
   - **Org ID**: Go to Team Settings → General (or check `.vercel/project.json` after running `vercel link`)

---

## ✅ Step 5: Verify Everything Works

### Test Your Deployment:

1. **Open your Vercel URL** (e.g., `https://your-project.vercel.app`)
2. **Check the browser console** (F12) for any errors
3. **Try to sign up/login** to verify Supabase auth is working
4. **Create a test ticket** to verify database connectivity

### Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong VITE_SUPABASE_PUBLISHABLE_KEY | Use the `anon public` key, not `service_role` |
| "relation does not exist" | Missing tables | Run COMPLETE_DATABASE_SETUP.sql again |
| White screen / no content | Build failed | Check Vercel build logs |
| Auth not working | Wrong URL | Verify VITE_SUPABASE_URL matches your project |

---

## 📊 Summary Checklist

### Essential (Do Now):
- [ ] Verify storage buckets exist in Supabase
- [ ] Import repository to Vercel
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy to Vercel
- [ ] Test the live deployment

### Optional (For CI/CD Automation):
- [ ] Generate Supabase Access Token
- [ ] Get Vercel Token and Project IDs
- [ ] Add all secrets to GitHub repository
- [ ] Test automatic deployment by pushing a commit

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Vercel Logs**: Project → Deployments → Click deployment → View Logs
2. **Check Supabase Logs**: Dashboard → Logs
3. **Check Browser Console**: Press F12 on the deployed site
4. **Verify Environment Variables**: Ensure no typos or extra spaces

---

## 🎯 What's Next After Deployment?

Once deployed, you can:

1. **Create admin user**: Sign up and run SQL to give yourself admin role
2. **Configure email templates**: In Supabase → Authentication → Email Templates
3. **Set up custom domain**: In Vercel → Domains
4. **Enable authentication providers**: In Supabase → Authentication → Providers

---

*Last Updated: December 2024*
