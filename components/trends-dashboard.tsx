'use client';
import { useState, useEffect } from 'react';
import { supabase, XTrend, GitHubRepo, UpdateLog } from '@/lib/supabase';
import { ExternalLink, TrendingUp, Star, GitBranch, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import DataSourceStatus from './data-source-status';
import SetupGuide from './setup-guide';

export default function TrendsDashboard() {
  const [xTrends, setXTrends] = useState<XTrend[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trendsRes, reposRes, logsRes] = await Promise.all([
        supabase
          .from('x_trends')
          .select('*')
          .order('fetched_at', { ascending: false })
          .limit(10),
        supabase
          .from('github_repos')
          .select('*')
          .order('stars', { ascending: false })
          .limit(10),
        supabase
          .from('update_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (trendsRes.error) throw trendsRes.error;
      if (reposRes.error) throw reposRes.error;
      if (logsRes.error) throw logsRes.error;

      setXTrends(trendsRes.data || []);
      setGithubRepos(reposRes.data || []);
      setUpdateLogs(logsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const triggerUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to trigger update');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger update');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();

    const trendsChannel = supabase
      .channel('x_trends_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'x_trends'
      }, () => {
        fetchData();
      })
      .subscribe();

    const reposChannel = supabase
      .channel('github_repos_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'github_repos'
      }, () => {
        fetchData();
      })
      .subscribe();

    const logsChannel = supabase
      .channel('update_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'update_logs'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(trendsChannel);
      supabase.removeChannel(reposChannel);
      supabase.removeChannel(logsChannel);
    };
  }, []);

  if (loading && xTrends.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Live Trends & Knowledge</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time data with automatic fallback sources
          </p>
        </div>
        <button
          onClick={triggerUpdate}
          disabled={updating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white disabled:opacity-50 hover:bg-brand-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Updating...' : 'Get Updates'}
        </button>
      </div>

      <SetupGuide />

      <DataSourceStatus />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <h3 className="text-xl font-semibold">X Trends</h3>
          </div>

          {xTrends.length === 0 ? (
            <div className="p-6 rounded-lg border text-center text-gray-500">
              <p>No trends available yet.</p>
              <p className="text-sm mt-2">Click "Update Now" to fetch latest trends.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {xTrends.map((trend) => (
                <a
                  key={trend.id}
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="font-medium">{trend.trend_name}</p>
                    {trend.tweet_count > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {trend.tweet_count.toLocaleString()} posts
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent-500" />
            <h3 className="text-xl font-semibold">Trending Repos</h3>
          </div>

          {githubRepos.length === 0 ? (
            <div className="p-6 rounded-lg border text-center text-gray-500">
              <p>No repositories available yet.</p>
              <p className="text-sm mt-2">Click "Update Now" to fetch trending repos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {githubRepos.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{repo.repo_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {repo.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stars.toLocaleString()}
                        </span>
                        {repo.language && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                            {repo.language}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs">
        <h4 className="font-semibold mb-2">Recent Updates</h4>
        {updateLogs.length === 0 ? (
          <p className="text-gray-500">No update history yet</p>
        ) : (
          <div className="space-y-1">
            {updateLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {log.source_type}: {log.status}
                  {log.items_fetched > 0 && ` (${log.items_fetched} items)`}
                </span>
                <span className="text-gray-500">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
