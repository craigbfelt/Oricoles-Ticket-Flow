# 🎉 Getting Started with Oricol Helpdesk

Welcome! This app is **100% free to run** with multiple options.

## 🤔 Which Guide Should I Read?

```
┌─────────────────────────────────────────────────────────┐
│  I want to...                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Try the app on my computer (no cloud)              │
│     → Read: LOCAL_SETUP.md                             │
│     → Time: 5 minutes                                  │
│     → Cost: $0                                         │
│                                                         │
│  ✅ Deploy to production (free hosting)                │
│     → Read: DEPLOYMENT.md                              │
│     → Time: 10 minutes                                 │
│     → Cost: $0/month                                   │
│                                                         │
│  ✅ See all options and choose                         │
│     → Read: SETUP.md                                   │
│     → Compares all 3 methods                           │
│                                                         │
│  ✅ Quick commands reference                           │
│     → Read: QUICKSTART.md                              │
│     → Cheat sheet for common tasks                     │
│                                                         │
│  ✅ Understand the full project                        │
│     → Read: README.md                                  │
│     → Complete documentation                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Fastest Path to Running App

### For Local Testing (5 minutes):

```bash
# 1. Install Docker Desktop (if you don't have it)
# Download from: https://www.docker.com/products/docker-desktop

# 2. Run these commands:
git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
cd oricol-ticket-flow-34e64301
npm install
npx supabase start

# 3. Copy the "anon key" from the output above

# 4. Create .env.local file:
echo 'VITE_SUPABASE_URL=http://localhost:54321' > .env.local
echo 'VITE_SUPABASE_PUBLISHABLE_KEY=<paste-anon-key-here>' >> .env.local

# 5. Start the app:
npm run dev

# 6. Open http://localhost:8080 in your browser
```

### For Production Deployment (10 minutes):

```bash
# 1. Create free Supabase account
#    Go to: https://supabase.com
#    Sign up (no credit card required)
#    Create a new project

# 2. Run these commands:
git clone https://github.com/craigfelt/oricol-ticket-flow-34e64301.git
cd oricol-ticket-flow-34e64301
npm install

# 3. Link to your Supabase project:
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 4. Build the app:
npm run build

# 5. Deploy the 'dist' folder to Netlify:
#    - Go to netlify.com
#    - Sign up (free)
#    - Drag & drop the 'dist' folder
#    - Done!
```

## 📚 Documentation Index

| File | Purpose | Read When |
|------|---------|-----------|
| **SETUP.md** | Choose your setup path | Starting fresh |
| **LOCAL_SETUP.md** | Local development guide | Want to run locally |
| **DEPLOYMENT.md** | Production deployment | Ready to deploy |
| **QUICKSTART.md** | Command reference | Need quick help |
| **README.md** | Full documentation | Want all details |
| **THIS FILE** | Navigation guide | Feeling lost |

## 💰 Cost Breakdown

All options are **FREE**:

| Setup | Monthly Cost | What You Get |
|-------|--------------|--------------|
| **Local Development** | $0 | Full app on your computer |
| **Supabase Free Tier** | $0 | 500MB DB + unlimited API |
| **Netlify/Vercel Hosting** | $0 | 100GB bandwidth/month |
| **Cloudflare Pages** | $0 | Unlimited bandwidth |

## ❓ FAQ

**Q: Do I need to pay for anything?**  
A: No! All options are completely free.

**Q: Which option should I choose?**  
A: Local development for testing, Supabase free tier for production.

**Q: Will the free tier expire?**  
A: No! Supabase free tier is permanent. It pauses after 7 days of inactivity but wakes up instantly.

**Q: Can I use my own domain?**  
A: Yes! All hosting platforms support custom domains for free.

**Q: Is this production-ready?**  
A: Yes! The free tiers are suitable for production apps with moderate traffic.

**Q: What happens if I exceed free tier limits?**  
A: You'll get notified and can either optimize or upgrade. Most apps never exceed the limits.

## 🆘 Need Help?

1. Check the troubleshooting section in [LOCAL_SETUP.md](./LOCAL_SETUP.md#troubleshooting)
2. Check the troubleshooting section in [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)
3. Review the [QUICKSTART.md](./QUICKSTART.md) for common commands
4. Open an issue in this repository

## 🎯 Next Steps

1. Choose your path (local or cloud)
2. Follow the setup guide
3. Create your first user account
4. Start using the app!

**Happy coding! 🚀**
