# Self-Updating Knowledge System - Architecture

## Overview

This system implements a self-updating knowledge platform that fetches real-time data from X (Twitter) and GitHub while maintaining strict security and ethical guidelines.

## Core Principles Protection

### 1. Data Source Validation
All data sources are:
- **Public APIs only** - No private or unauthorized data access
- **Rate limited** - Respects API provider limits
- **Verified sources** - Only trusted platforms (X, GitHub)
- **No scraping** - Uses official APIs only

### 2. Content Filtering & Safety
The system ensures:
- **Public information only** - No personal/private data
- **Read-only access** - No modification of source data
- **Transparent sourcing** - All content attributed to source
- **User control** - Manual update triggers available

### 3. Security Architecture

#### Database Layer (Supabase)
```
┌─────────────────────────────────────┐
│ Row Level Security (RLS)            │
├─────────────────────────────────────┤
│ ✓ Public read for verified content  │
│ ✓ Write restricted to service role  │
│ ✓ No direct user data access        │
│ ✓ Automatic data expiration         │
└─────────────────────────────────────┘
```

#### Edge Functions (Serverless)
```
┌─────────────────────────────────────┐
│ Input Validation & Rate Limiting    │
├─────────────────────────────────────┤
│ ✓ Validates all API responses       │
│ ✓ Error handling & logging          │
│ ✓ CORS protection                   │
│ ✓ Service role authentication       │
└─────────────────────────────────────┘
```

#### Frontend (Next.js)
```
┌─────────────────────────────────────┐
│ Content Security Policy             │
├─────────────────────────────────────┤
│ ✓ CSP headers via middleware        │
│ ✓ XSS protection                    │
│ ✓ Frame denial                      │
│ ✓ HTTPS only                        │
└─────────────────────────────────────┘
```

### 4. Update Orchestration

#### Smart Rate Limiting
```typescript
// X API: 15-minute throttle
if (lastUpdate > 15 minutes ago) {
  fetchXTrends()
} else {
  skip("Respecting rate limits")
}

// GitHub API: 60-minute throttle
if (lastUpdate > 60 minutes ago) {
  fetchGitHubTrending()
} else {
  skip("Respecting rate limits")
}
```

#### Automatic Data Cleanup
```sql
-- X trends: 7-day retention
DELETE FROM x_trends
WHERE fetched_at < NOW() - INTERVAL '7 days';

-- GitHub repos: 30-day retention
DELETE FROM github_repos
WHERE fetched_at < NOW() - INTERVAL '30 days';
```

## Data Flow

```
┌──────────────┐
│   X API      │──┐
└──────────────┘  │
                  │
┌──────────────┐  │    ┌──────────────────┐    ┌─────────────┐
│  GitHub API  │──┼───▶│ Edge Functions   │───▶│  Supabase   │
└──────────────┘  │    │ (Validation)     │    │  Database   │
                  │    └──────────────────┘    └─────────────┘
┌──────────────┐  │                                    │
│ Manual User  │──┘                                    │
│  Trigger     │                                       │
└──────────────┘                                       │
                                                       ▼
                                              ┌─────────────┐
                                              │  Next.js    │
                                              │  Frontend   │
                                              └─────────────┘
```

## Ethical Considerations

### What This System Does
✅ Aggregates public trending information
✅ Provides transparency about data sources
✅ Respects API rate limits and terms
✅ Implements automatic data expiration
✅ Gives users control over updates
✅ Logs all operations for transparency

### What This System Does NOT Do
❌ Collect personal information
❌ Track individual users
❌ Scrape unauthorized content
❌ Store private data
❌ Bypass rate limits
❌ Modify source data

## Extensibility

### Adding New Data Sources

**Requirements for New Sources:**
1. Must use official, public APIs
2. Must respect rate limits
3. Must only access public information
4. Must include proper attribution
5. Must implement error handling
6. Must log all operations

**Template:**
```typescript
// 1. Create Edge Function
export async function fetchNewSource() {
  // Validate API access
  // Fetch public data only
  // Transform and sanitize
  // Store with attribution
  // Log operation
}

// 2. Add to Database
CREATE TABLE new_source (
  id uuid PRIMARY KEY,
  -- public data fields only
  source_url text NOT NULL, -- Always attribute
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE new_source ENABLE ROW LEVEL SECURITY;

// 3. Update Orchestrator
// Add to update cycle with appropriate rate limiting
```

## Monitoring & Logging

### Update Logs Table
Every operation is logged:
```sql
SELECT
  source_type,
  status,
  items_fetched,
  error_message,
  created_at
FROM update_logs
ORDER BY created_at DESC;
```

### Success Metrics
- Total items fetched
- Success/error rates
- Rate limit events
- Data freshness

### Error Handling
All errors are:
- Logged to database
- Displayed to users (when appropriate)
- Never exposed sensitive information
- Used to improve reliability

## Privacy & Compliance

### Data Retention Policy
- **X Trends**: 7 days (sufficient for trend analysis)
- **GitHub Repos**: 30 days (valuable for longer tracking)
- **Update Logs**: 90 days (operational transparency)
- **User Data**: None collected (privacy by design)

### GDPR Compliance
- No personal data collection
- All data from public sources
- Clear data retention policies
- Right to access (all data is public)
- Right to erasure (automatic expiration)

### Terms of Service Compliance
- **X API**: Respects rate limits, uses v2 API properly
- **GitHub API**: Uses public API, includes User-Agent
- **Supabase**: Uses service within ToS
- **Next.js/Vercel**: Standard deployment practices

## Scaling Considerations

### Current Limits
- X API: ~450 requests/15 min window
- GitHub API: 60 requests/hour (unauthenticated)
- Database: Unlimited (within Supabase tier)
- Edge Functions: 500K invocations/month (free tier)

### Optimization Strategies
1. Intelligent caching (already implemented)
2. Conditional updates (skip if recent)
3. Batch operations (multiple items per request)
4. Progressive data loading (fetch incrementally)

## Testing

### Recommended Tests
```bash
# 1. Manual update trigger
curl -X POST https://your-project.supabase.co/functions/v1/update-orchestrator

# 2. Check update logs
# Query database: SELECT * FROM update_logs

# 3. Verify data freshness
# Query database: SELECT MAX(fetched_at) FROM x_trends

# 4. Test rate limiting
# Multiple rapid calls should be throttled
```

## Conclusion

This architecture ensures that the self-updating knowledge system:
- **Respects** API providers and their terms
- **Protects** user privacy (no personal data)
- **Maintains** transparency in all operations
- **Implements** proper security measures
- **Provides** value through aggregated public information

The system is designed to be **ethical, secure, and sustainable** while providing real-time knowledge from trusted sources.
