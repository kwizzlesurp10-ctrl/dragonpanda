# Dragon & Panda - Complete Setup Guide

## 🎯 What You Have

A fully functional self-updating knowledge platform that:
- ✅ Fetches real-time X (Twitter) trends
- ✅ Displays trending GitHub repositories
- ✅ Stores data securely in Supabase
- ✅ Updates automatically with rate limiting
- ✅ Protects core AI principles and privacy
- ✅ Beautiful responsive UI with dark mode

## 🚀 Quick Start (3 Steps)

### 1. Development Mode
```bash
npm run dev
```
Visit: http://localhost:3000

### 2. View Trends Dashboard
Navigate to: http://localhost:3000/trends

### 3. Trigger First Update
Click the "Update Now" button on the trends page

**Note:** Updates will work immediately with public data. Add API tokens for enhanced features (see below).

## 📊 Current Status

### ✅ What's Working Now
- Database schema created and secured
- 3 Edge Functions deployed and ready
- Frontend fully functional
- All pages and routes working
- Rate limiting implemented
- RLS policies active

### ⚙️ What's Optional
- X API token (for X trends)
- GitHub token (for higher rate limits)

## 🔑 Optional API Configuration

### X (Twitter) API Setup

**Why Add This:**
- Get real-time trending topics from X
- See tweet volumes and engagement metrics
- Track hashtags and topics

**How to Add:**
1. Visit: https://developer.x.com/en/portal/dashboard
2. Create a new project and app
3. Generate a Bearer Token
4. Add to Supabase Edge Function secrets:
   ```bash
   # In Supabase Dashboard:
   # Settings > Edge Functions > Add Secret
   Name: X_BEARER_TOKEN
   Value: your_bearer_token_here
   ```

**Without This Token:**
- Edge function will return a friendly error
- GitHub trends will still work
- System remains fully functional

### GitHub API Token

**Why Add This:**
- Increase rate limit from 60 to 5,000 requests/hour
- More reliable updates
- Access to private repos (if needed)

**How to Add:**
1. Visit: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `public_repo` (minimum)
4. Add to Supabase Edge Function secrets:
   ```bash
   Name: GITHUB_TOKEN
   Value: your_github_token_here
   ```

**Without This Token:**
- System works with 60 requests/hour
- Sufficient for most use cases
- Updates still function properly

## 📁 Project Structure

```
dragonandpanda.space/
├── app/                          # Next.js 13 App Router
│   ├── (marketing)/
│   │   └── trends/              # 📈 Live trends page
│   ├── api/
│   │   └── events/              # Newsletter API
│   ├── layout.tsx               # Root layout with Header/Footer
│   ├── page.tsx                 # Home page
│   ├── privacy/                 # Privacy policy
│   └── terms/                   # Terms of service
├── components/
│   ├── trends-dashboard.tsx     # 🎯 Main trends component
│   ├── header.tsx               # Navigation
│   ├── footer.tsx               # Footer
│   ├── hero.tsx                 # Hero section
│   ├── feature-cards.tsx        # Feature showcase
│   └── newsletter-form.tsx      # Newsletter signup
├── lib/
│   ├── supabase.ts              # 🗄️ Supabase client & types
│   └── utils.ts                 # Utilities
├── supabase/functions/          # ⚡ Edge Functions
│   ├── fetch-x-trends/          # X API integration
│   ├── fetch-github-trending/   # GitHub API integration
│   └── update-orchestrator/     # Coordinated updates
└── styles/
    └── globals.css              # Global styles
```

## 🗄️ Database Tables

### x_trends
Stores trending topics from X
```sql
id, trend_name, tweet_count, url, category, fetched_at, created_at
```

### github_repos
Stores trending GitHub repositories
```sql
id, repo_name, description, stars, language, url, topics, fetched_at, created_at
```

### knowledge_entries
Extensible knowledge base (ready for future use)
```sql
id, title, content, source, source_url, category, tags, relevance_score, verified, created_at, updated_at
```

### update_logs
Tracks all update operations
```sql
id, source_type, status, items_fetched, error_message, created_at
```

## ⚡ Edge Functions

### 1. fetch-x-trends
**Purpose:** Fetches trending topics from X API
**Endpoint:** `POST /functions/v1/fetch-x-trends`
**Rate Limit:** 15-minute throttle
**Requires:** X_BEARER_TOKEN (optional)

### 2. fetch-github-trending
**Purpose:** Fetches trending repositories from GitHub
**Endpoint:** `POST /functions/v1/fetch-github-trending`
**Rate Limit:** 60-minute throttle
**Requires:** GITHUB_TOKEN (optional, recommended)

### 3. update-orchestrator
**Purpose:** Coordinates all updates and cleanup
**Endpoint:** `POST /functions/v1/update-orchestrator`
**Rate Limit:** Respects individual source limits
**Features:**
- Automatic rate limiting
- Skip recent updates
- Cleanup old data
- Comprehensive logging

## 🔒 Security Features

### Row Level Security (RLS)
All tables protected:
- Public read access only
- Write restricted to service role
- No user data exposure

### Content Security Policy
Implemented via middleware:
- XSS protection
- Frame denial
- Strict CSP headers

### Rate Limiting
Multiple layers:
- Edge function throttling
- API respect for provider limits
- Automatic backoff

### Data Privacy
- No personal data collected
- All sources public
- Automatic data expiration
- Transparent logging

## 🎨 UI Features

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Touch-friendly interactions

### Dark Mode
- Automatic system detection
- Smooth transitions
- Accessible colors

### Interactive Elements
- Real-time updates
- Loading states
- Error handling
- Success feedback

## 🧪 Testing the System

### 1. Check Database Connection
```bash
# In your browser's developer console on /trends page:
# Should see data fetching without errors
```

### 2. Trigger Manual Update
```bash
# Click "Update Now" button on /trends page
# Watch the update logs section for status
```

### 3. Test Edge Functions Directly
```bash
# Replace with your Supabase URL
curl -X POST https://your-project.supabase.co/functions/v1/update-orchestrator \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 4. Query Database
```sql
-- Check recent updates
SELECT * FROM update_logs ORDER BY created_at DESC LIMIT 10;

-- Check GitHub repos
SELECT repo_name, stars, language FROM github_repos ORDER BY stars DESC LIMIT 10;

-- Check X trends (if API configured)
SELECT trend_name, tweet_count FROM x_trends ORDER BY fetched_at DESC LIMIT 10;
```

## 🔄 Update Schedule

### Automatic Updates
- **X Trends**: Every 15 minutes (when API configured)
- **GitHub**: Every 60 minutes
- **Cleanup**: Runs with each orchestrator call

### Manual Updates
- Click "Update Now" on trends page
- Respects rate limits (will skip if recent)
- Shows status in real-time

### Data Retention
- **X Trends**: 7 days
- **GitHub Repos**: 30 days
- **Update Logs**: 90 days

## 📈 Monitoring

### Update Logs Dashboard
Located at bottom of `/trends` page:
- Shows recent update attempts
- Displays success/error status
- Shows items fetched count
- Timestamps for each operation

### Database Queries
```sql
-- Success rate by source
SELECT
  source_type,
  status,
  COUNT(*) as count
FROM update_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source_type, status;

-- Latest data freshness
SELECT
  'x_trends' as source,
  MAX(fetched_at) as last_update
FROM x_trends
UNION ALL
SELECT
  'github_repos',
  MAX(fetched_at)
FROM github_repos;
```

## 🚨 Troubleshooting

### No Trends Showing
**Cause:** First time setup, no data yet
**Solution:** Click "Update Now" button

### "X API not configured" Error
**Cause:** X_BEARER_TOKEN not set
**Solution:** Either add token (see above) or ignore (GitHub still works)

### Rate Limit Errors
**Cause:** Too many requests
**Solution:** Wait for throttle period to expire (automatic)

### Build Errors
**Cause:** Missing dependencies
**Solution:**
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

## 🎯 Next Steps

### 1. Add API Tokens (Optional)
Follow the "Optional API Configuration" section above

### 2. Customize UI
- Edit `components/trends-dashboard.tsx`
- Modify colors in `tailwind.config.ts`
- Update content in app pages

### 3. Add More Data Sources
See `ARCHITECTURE.md` for extension guide

### 4. Deploy to Production
```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push

# Deploy to Vercel
# 1. Import GitHub repo in Vercel
# 2. Add environment variables
# 3. Deploy
```

### 5. Set Up Scheduled Updates
Use Vercel Cron Jobs or external scheduler to call:
```
POST https://your-site.com/api/trigger-update
```

## 📚 Documentation

- **README.md** - Project overview and quick start
- **ARCHITECTURE.md** - Technical deep dive
- **SETUP_GUIDE.md** - This file
- Code comments - Throughout the project

## 🤝 Support

### Common Questions

**Q: Do I need both API tokens?**
A: No! The system works without any tokens. Tokens enhance functionality.

**Q: How often should I update?**
A: Manual updates or every 15-60 minutes via cron job.

**Q: Is my data secure?**
A: Yes! RLS, CSP, rate limiting, and public data only.

**Q: Can I add more data sources?**
A: Yes! Follow the extension guide in ARCHITECTURE.md

**Q: What's the cost?**
A: Free tier handles most use cases. Supabase and Vercel both offer generous free tiers.

## 🎉 You're All Set!

Your self-updating knowledge platform is ready to use. Start by:
1. Running `npm run dev`
2. Visiting http://localhost:3000/trends
3. Clicking "Update Now"

Enjoy your real-time knowledge dashboard! 🚀
