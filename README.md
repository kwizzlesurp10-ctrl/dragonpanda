# Dragon & Panda - Self-Updating Knowledge & Trends Platform

A Next.js application that automatically fetches and displays real-time trends from X (Twitter) and GitHub, powered by Supabase Edge Functions.

## Features

### Core Functionality
- **Real-time X Trends**: Fetches trending topics from X API
- **GitHub Trending Repos**: Displays trending open-source repositories
- **Automated Updates**: Self-updating system with intelligent rate limiting
- **Secure Storage**: All data stored in Supabase with Row Level Security (RLS)
- **Clean UI**: Beautiful, responsive design with dark mode support

### Security & Performance
- Content Security Policy (CSP) via middleware
- Rate limiting on all API endpoints
- Row Level Security on all database tables
- Edge-rendered for optimal performance
- Automatic cleanup of old data

## Architecture

### Database Schema
- `x_trends` - Stores trending topics from X
- `github_repos` - Stores trending GitHub repositories
- `knowledge_entries` - Extensible knowledge base
- `update_logs` - Tracks all update operations

### Edge Functions
1. **fetch-x-trends** - Fetches trends from X API
2. **fetch-github-trending** - Fetches trending repos from GitHub
3. **update-orchestrator** - Manages scheduled updates and cleanup

### Rate Limiting
- X API: Updates every 15 minutes (respects rate limits)
- GitHub API: Updates every 60 minutes
- Automatic skipping when recently updated
- Data retention: 7 days for X trends, 30 days for GitHub repos

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account (database already provisioned)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file already contains Supabase credentials. Optionally add:

   ```bash
   # Optional: X API credentials (for X trends)
   # Get from: https://developer.x.com
   X_BEARER_TOKEN=your_x_bearer_token

   # Optional: GitHub token (for higher rate limits)
   # Get from: https://github.com/settings/tokens
   GITHUB_TOKEN=your_github_token
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Usage

### Viewing Trends
Navigate to `/trends` to see the trends dashboard with:
- Live X trending topics
- Trending GitHub repositories
- Update status and history
- Manual update trigger button

### Manual Updates
Click the "Update Now" button on the trends page to trigger an immediate update (respects rate limits).

### API Endpoints

#### Update Orchestrator
```bash
POST https://your-supabase-url.supabase.co/functions/v1/update-orchestrator
```
Triggers coordinated updates of all data sources.

#### Fetch X Trends
```bash
POST https://your-supabase-url.supabase.co/functions/v1/fetch-x-trends
```
Fetches latest trends from X.

#### Fetch GitHub Trending
```bash
POST https://your-supabase-url.supabase.co/functions/v1/fetch-github-trending
```
Fetches trending repositories from GitHub.

## Database Queries

### Get Latest X Trends
```sql
SELECT * FROM x_trends
ORDER BY fetched_at DESC
LIMIT 10;
```

### Get Top GitHub Repos
```sql
SELECT * FROM github_repos
ORDER BY stars DESC
LIMIT 10;
```

### Check Update History
```sql
SELECT * FROM update_logs
ORDER BY created_at DESC
LIMIT 20;
```

## Extending the System

### Adding New Data Sources

1. **Create a new Edge Function**
   ```bash
   # Deploy via Supabase MCP tools
   ```

2. **Add a new table**
   ```sql
   CREATE TABLE IF NOT EXISTS your_source (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     -- your columns
     fetched_at timestamptz DEFAULT now(),
     created_at timestamptz DEFAULT now()
   );

   ALTER TABLE your_source ENABLE ROW LEVEL SECURITY;
   ```

3. **Update the orchestrator**
   Add your new source to the `update-orchestrator` function.

### Adding Knowledge Entries

The `knowledge_entries` table is ready for manual or automated population:

```sql
INSERT INTO knowledge_entries (
  title,
  content,
  source,
  source_url,
  category,
  tags,
  relevance_score,
  verified
) VALUES (
  'Your Title',
  'Your content',
  'Source name',
  'https://source.url',
  'category',
  ARRAY['tag1', 'tag2'],
  85,
  true
);
```

## Security Considerations

### Row Level Security
All tables have RLS enabled:
- Public read access for verified/published content
- Write access restricted to service role
- No direct user data access

### API Security
- All Edge Functions validate inputs
- Rate limiting prevents abuse
- CORS headers properly configured
- Service role keys never exposed to client

### Data Privacy
- No personal data collected without consent
- All external data is public information
- Update logs contain no sensitive information
- Automatic cleanup of old data

## Troubleshooting

### No trends showing up
1. Check if API keys are configured in Supabase Edge Function secrets
2. Click "Update Now" to trigger manual update
3. Check update logs for errors

### Rate limit errors
- X API has strict rate limits - updates automatically throttled
- GitHub API works without token but has lower limits
- Add tokens to increase rate limits

### Build errors
Make sure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Technology Stack

- **Frontend**: Next.js 13 (App Router), React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Real-time)
- **APIs**: X Developer API, GitHub REST API
- **Security**: Row Level Security, CSP, Rate Limiting
- **Deployment**: Vercel-ready

## License

© 2024 Dragon & Panda. All rights reserved.

## Support

For issues or questions, check the update logs in the database or review the Edge Function deployment logs in your Supabase dashboard.
