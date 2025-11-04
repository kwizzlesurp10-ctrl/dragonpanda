'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DataSource {
  id: string;
  source_name: string;
  source_type: string;
  is_enabled: boolean;
  requires_token: boolean;
  token_configured: boolean;
  health_status: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  success_count: number;
  error_count: number;
  priority: number;
}

export default function DataSourceStatus() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setSources(data || []);
    } catch (err) {
      console.error('Error fetching data sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();

    const channel = supabase
      .channel('data_sources_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'data_sources'
      }, () => {
        fetchSources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      healthy: 'default',
      degraded: 'secondary',
      offline: 'destructive',
      unknown: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getSourceLabel = (sourceName: string) => {
    const labels: Record<string, string> = {
      x_api: 'X (Twitter) API',
      github_api: 'GitHub API',
      github_trending_fallback: 'GitHub Trending Fallback',
      hackernews_api: 'HackerNews API',
    };
    return labels[sourceName] || sourceName;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Source Status</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Source Status</CardTitle>
        <CardDescription>
          Real-time health monitoring of all data sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-start justify-between p-3 rounded-lg border bg-white dark:bg-gray-800"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">{getStatusIcon(source.health_status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{getSourceLabel(source.source_name)}</p>
                    {getStatusBadge(source.health_status)}
                  </div>

                  {source.requires_token && !source.token_configured && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                      ⚠️ API token not configured - using fallback
                    </p>
                  )}

                  {source.last_error_message && source.health_status !== 'healthy' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                      {source.last_error_message}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    {source.last_success_at && (
                      <span>
                        Last success: {new Date(source.last_success_at).toLocaleTimeString()}
                      </span>
                    )}
                    <span>
                      Success: {source.success_count} | Errors: {source.error_count}
                    </span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="text-xs capitalize ml-2">
                {source.source_type}
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
          <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
            ℹ️ About Data Sources
          </p>
          <p className="text-blue-600 dark:text-blue-400 text-xs">
            The system automatically uses fallback sources when primary APIs are unavailable or not configured.
            This ensures you always get fresh data without requiring API tokens.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
