# Quick Start: Apply Migrations with GitHub Actions

**Problem:** You need to apply database migrations but don't have Lovable credits or dashboard access.

**Solution:** Use GitHub Actions to apply migrations directly from GitHub.

## ⚡ Quick Start (3 Steps)

### Step 1: Add Secrets (One-time setup)

1. Get your **Supabase Access Token**:
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy the token (you won't see it again!)

2. Get your **Database Password**:
   - Go to https://supabase.com/dashboard/project/YOUR-PROJECT/settings/database
   - Find "Database Password" section
   - Copy or reset your password

3. Add secrets to GitHub:
   - Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Click "New repository secret"
   - Add two secrets:
     - Name: `SUPABASE_ACCESS_TOKEN`, Value: (your token from step 1)
     - Name: `SUPABASE_DB_PASSWORD`, Value: (your password from step 2)

### Step 2: Run the Workflow

1. Go to your GitHub repo → **Actions** tab
2. Click "**Apply DB migrations**" in the left sidebar
3. Click "**Run workflow**" button (on the right)
4. Select your branch (usually `main`)
5. Click the green "**Run workflow**" button

### Step 3: Verify

1. Wait for the workflow to complete (green checkmark = success)
2. Go to your Supabase Dashboard → **Database** → **Tables**
3. Verify new tables/columns are created
4. Check **Database** → **Policies** for new RLS policies

## 🔍 Troubleshooting

**"SUPABASE_ACCESS_TOKEN secret is not set"**
- Go back to Step 1 and add the secrets
- Make sure spelling is exactly: `SUPABASE_ACCESS_TOKEN`

**"Permission denied"**
- Your access token may have expired
- Generate a new token and update the secret

**Don't see the workflow in Actions tab?**
- Make sure you've pulled the latest changes from GitHub
- The `.github/workflows/apply-migrations.yml` file must exist in your branch

## 📚 Need More Help?

- **Full Guide:** [GITHUB_ACTIONS_MIGRATIONS.md](./GITHUB_ACTIONS_MIGRATIONS.md)
- **Alternative Methods:** [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md)
- **Migration Guide:** [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)

## ⚠️ Important Safety Note

**Always create a backup before applying migrations!**
- Supabase Dashboard → Your Project → Database → Backups
- Create manual backup before running the workflow
