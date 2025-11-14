# ⚡ SUPER QUICK START

**For the impatient developer who just wants the app running NOW!**

## One Command Setup

```bash
./setup.sh
```

That's it! Follow the prompts, then open http://localhost:8080

---

## Or If You Know What You Want

### Docker Compose (Full Stack)
```bash
make setup-docker
```

### Local Supabase (Lightweight)
```bash
make setup-local
```

### Check Everything First
```bash
make prereqs
```

---

## Important Facts (Read This!)

### ✅ Docker Desktop is FREE
- No account needed
- No payment needed
- Just download and use
- If prompted to login, click "Continue without signing in"

### ✅ GitHub Copilot Works With Your Local App
- Keep `npm run dev` running
- Copilot makes changes on GitHub
- You pull and test locally: `git pull origin <branch>`
- Everything works together!

---

## What Happens Next

1. **Setup runs** → Checks your system, installs dependencies
2. **Services start** → Database and app services launch
3. **App is ready** → Open http://localhost:8080
4. **Sign up** → Use `admin@oricol.co.za` for automatic admin access
5. **Start using** → Create tickets, manage assets, etc.

---

## If Something Goes Wrong

```bash
./troubleshoot.sh
```

This will diagnose and fix common issues.

---

## Daily Workflow

```bash
# Morning (start of day)
npm run dev          # Start app, leave running

# During development
git pull origin main # Get latest changes
# Edit files, test at localhost:8080

# When Copilot makes changes
git pull origin copilot/feature-xyz
# Test changes, merge if good
```

---

## Need More Details?

- **Complete guide:** AUTOMATED_SETUP.md
- **Quick commands:** CHEAT_SHEET.md
- **Docker info:** DOCKER_FREE_NO_ACCOUNT.md
- **Copilot workflow:** GITHUB_COPILOT_WITH_LOCAL_DEV.md

---

**That's it! Run `./setup.sh` and you'll be coding in minutes! 🚀**
