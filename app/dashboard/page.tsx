'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getUserUsageStats } from '@/lib/rate-limiter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Activity, BarChart3, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const usageStats = await getUserUsageStats(user.id);
      setStats(usageStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Unable to load dashboard</p>
      </div>
    );
  }

  const hourlyPercentage = (stats.currentHourUsage / stats.limits.hourly) * 100;
  const dailyPercentage = (stats.todayUsage / stats.limits.daily) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Subscription Plan</h2>
            <Badge className="capitalize">{stats.tier?.tier_name || 'Free'}</Badge>
          </div>
          {stats.tier && (
            <p className="text-sm text-slate-600">
              ${stats.tier.price_monthly}/month
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Hourly Usage</CardTitle>
                <Activity className="h-5 w-5 text-slate-600" />
              </div>
              <CardDescription>Current hour API calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats.currentHourUsage}
                  </p>
                  <p className="text-sm text-slate-600">
                    of {stats.limits.hourly} calls
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {Math.round(hourlyPercentage)}%
                </p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-900 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(hourlyPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Usage</CardTitle>
                <BarChart3 className="h-5 w-5 text-slate-600" />
              </div>
              <CardDescription>Today&apos;s total API calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats.todayUsage}
                  </p>
                  <p className="text-sm text-slate-600">
                    of {stats.limits.daily} calls
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {Math.round(dailyPercentage)}%
                </p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-slate-900 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent API Calls</CardTitle>
              <TrendingUp className="h-5 w-5 text-slate-600" />
            </div>
            <CardDescription>Your latest API activity</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCalls.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">
                No API calls yet. Start exploring trends!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentCalls.map((call: any) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {call.method} {call.endpoint}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(call.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={call.response_status < 400 ? 'default' : 'destructive'}
                    >
                      {call.response_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button onClick={() => router.push('/trends')}>
            View Trends
          </Button>
          <Button variant="outline" onClick={() => router.push('/auth/subscription')}>
            Manage Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}
