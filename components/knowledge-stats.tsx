'use client';

import { useEffect, useState } from 'react';
import { getKnowledgeStats } from '@/lib/knowledge-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, TrendingUp, Tag, Layers, Loader2 } from 'lucide-react';

export default function KnowledgeStats() {
  const [stats, setStats] = useState<{
    total: number;
    recentlyAdded: number;
    categoriesCount: number;
    tagsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getKnowledgeStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading knowledge stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Total Entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Added This Week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{stats.recentlyAdded}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{stats.categoriesCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Unique Tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{stats.tagsCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
