import { supabase } from './supabase';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  message?: string;
}

export interface SubscriptionTier {
  id: string;
  tier_name: string;
  api_calls_per_hour: number;
  api_calls_per_day: number;
  price_monthly: number;
  features: Record<string, any>;
}

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier | null> {
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('subscription_tier_id, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (subError || !subscription) {
    const { data: freeTier } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('tier_name', 'free')
      .maybeSingle();

    return freeTier;
  }

  const { data: tier, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('id', subscription.subscription_tier_id)
    .maybeSingle();

  if (tierError || !tier) {
    const { data: freeTier } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('tier_name', 'free')
      .maybeSingle();

    return freeTier;
  }

  return tier;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const tier = await getUserSubscriptionTier(userId);

  if (!tier) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      resetAt: new Date(),
      message: 'Unable to determine subscription tier',
    };
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];

  const { data: tracker, error: trackerError } = await supabase
    .from('rate_limit_tracker')
    .select('*')
    .eq('user_id', userId)
    .eq('date', currentDate)
    .eq('hour', currentHour)
    .maybeSingle();

  if (trackerError && trackerError.code !== 'PGRST116') {
    return {
      allowed: false,
      remaining: 0,
      limit: tier.api_calls_per_hour,
      resetAt: new Date(now.getTime() + 3600000),
      message: 'Error checking rate limit',
    };
  }

  const hourlyCount = tracker?.hourly_count || 0;
  const dailyCount = tracker?.daily_count || 0;

  if (hourlyCount >= tier.api_calls_per_hour) {
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      limit: tier.api_calls_per_hour,
      resetAt: nextHour,
      message: `Hourly rate limit exceeded. Limit: ${tier.api_calls_per_hour} requests/hour`,
    };
  }

  if (dailyCount >= tier.api_calls_per_day) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      limit: tier.api_calls_per_day,
      resetAt: tomorrow,
      message: `Daily rate limit exceeded. Limit: ${tier.api_calls_per_day} requests/day`,
    };
  }

  return {
    allowed: true,
    remaining: Math.min(
      tier.api_calls_per_hour - hourlyCount,
      tier.api_calls_per_day - dailyCount
    ),
    limit: tier.api_calls_per_hour,
    resetAt: new Date(now.getTime() + 3600000),
  };
}

export async function incrementRateLimit(userId: string): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];

  const { data: tracker } = await supabase
    .from('rate_limit_tracker')
    .select('*')
    .eq('user_id', userId)
    .eq('date', currentDate)
    .eq('hour', currentHour)
    .maybeSingle();

  if (!tracker) {
    const { data: todayTotal } = await supabase
      .from('rate_limit_tracker')
      .select('daily_count')
      .eq('user_id', userId)
      .eq('date', currentDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const dailyCount = todayTotal?.daily_count || 0;

    await supabase
      .from('rate_limit_tracker')
      .insert({
        user_id: userId,
        date: currentDate,
        hour: currentHour,
        hourly_count: 1,
        daily_count: dailyCount + 1,
        last_reset_hourly: now.toISOString(),
        last_reset_daily: now.toISOString(),
      });
  } else {
    await supabase
      .from('rate_limit_tracker')
      .update({
        hourly_count: tracker.hourly_count + 1,
        daily_count: tracker.daily_count + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', tracker.id);
  }
}

export async function logApiUsage(
  userId: string,
  endpoint: string,
  method: string,
  responseStatus: number,
  rateLimitRemaining: number
): Promise<void> {
  await supabase
    .from('api_usage_logs')
    .insert({
      user_id: userId,
      endpoint,
      method,
      response_status: responseStatus,
      rate_limit_remaining: rateLimitRemaining,
    });
}

export async function getUserUsageStats(userId: string) {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  const tier = await getUserSubscriptionTier(userId);

  const { data: currentUsage } = await supabase
    .from('rate_limit_tracker')
    .select('*')
    .eq('user_id', userId)
    .eq('date', currentDate)
    .eq('hour', currentHour)
    .maybeSingle();

  const { data: todayTotal } = await supabase
    .from('rate_limit_tracker')
    .select('daily_count')
    .eq('user_id', userId)
    .eq('date', currentDate)
    .order('hour', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentLogs } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    tier,
    currentHourUsage: currentUsage?.hourly_count || 0,
    todayUsage: todayTotal?.daily_count || 0,
    recentCalls: recentLogs || [],
    limits: {
      hourly: tier?.api_calls_per_hour || 0,
      daily: tier?.api_calls_per_day || 0,
    },
  };
}
