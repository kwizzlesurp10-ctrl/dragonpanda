'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  tier_name: string;
  api_calls_per_hour: number;
  api_calls_per_day: number;
  price_monthly: number;
  features: Record<string, any>;
}

export default function SubscriptionPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (!error && data) {
      setTiers(data);
    }
    setLoading(false);
  };

  const selectTier = async (tierId: string, tierName: string) => {
    setSelecting(tierId);

    try {
      const { user } = await getCurrentUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_tier_id: tierId,
          status: 'active',
        });

      if (error) {
        console.error('Error creating subscription:', error);
        alert('Failed to set up subscription. Please try again.');
        setSelecting(null);
        return;
      }

      if (tierName === 'free') {
        router.push('/dashboard');
      } else {
        router.push(`/auth/payment?tier=${tierId}`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-600">
            Select the perfect plan for your needs. Start free and upgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const features = tier.features || {};
            const isPopular = tier.tier_name === 'pro';

            return (
              <Card
                key={tier.id}
                className={`relative ${
                  isPopular ? 'border-2 border-slate-900 shadow-lg scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-slate-900 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl capitalize">{tier.tier_name}</CardTitle>
                  <CardDescription>{features.description || ''}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${tier.price_monthly}</span>
                    <span className="text-slate-600">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-sm">
                        {tier.api_calls_per_hour} API calls per hour
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-sm">
                        {tier.api_calls_per_day} API calls per day
                      </span>
                    </div>
                    {features.trends_access && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">X Trends access</span>
                      </div>
                    )}
                    {features.github_access && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">GitHub Trending access</span>
                      </div>
                    )}
                    {features.email_notifications && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Email notifications</span>
                      </div>
                    )}
                    {features.api_access && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">API access</span>
                      </div>
                    )}
                    {features.advanced_analytics && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Advanced analytics</span>
                      </div>
                    )}
                    {features.priority_refresh && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Priority data refresh</span>
                      </div>
                    )}
                    {features.dedicated_support && (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-sm">Dedicated support</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => selectTier(tier.id, tier.tier_name)}
                    disabled={selecting !== null}
                  >
                    {selecting === tier.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      `Choose ${tier.tier_name}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/auth/login')}>
              Sign in
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
