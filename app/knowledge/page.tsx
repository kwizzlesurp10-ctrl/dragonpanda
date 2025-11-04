'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getKnowledgeEntries,
  getKnowledgeCategories,
  getKnowledgeTags,
  KnowledgeEntry,
  KnowledgeFilters
} from '@/lib/knowledge-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  BookOpen,
  Star,
  ExternalLink,
  Loader2,
  TrendingUp,
  Github
} from 'lucide-react';

export default function KnowledgePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedTags]);

  const loadData = async () => {
    try {
      const [entriesData, categoriesData, tagsData] = await Promise.all([
        getKnowledgeEntries(),
        getKnowledgeCategories(),
        getKnowledgeTags(),
      ]);

      setEntries(entriesData);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading knowledge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const filters: KnowledgeFilters = {
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      const filtered = await getKnowledgeEntries(filters);
      setEntries(filtered);
    } catch (error) {
      console.error('Error filtering entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
  };

  const getSourceIcon = (source: string) => {
    if (source.includes('x_api') || source.includes('twitter')) {
      return <TrendingUp className="h-4 w-4" />;
    }
    if (source.includes('github')) {
      return <Github className="h-4 w-4" />;
    }
    return <BookOpen className="h-4 w-4" />;
  };

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Knowledge Base</h1>
          <p className="text-lg text-slate-600">
            Curated insights and discoveries from trending topics and popular repositories
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search knowledge entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>

          <Tabs defaultValue="all" onValueChange={(v) => setSelectedCategory(v === 'all' ? '' : v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.slice(0, 6).map(category => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 15).map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-lg text-slate-600">No knowledge entries found</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or check back later</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(entry.source)}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {entry.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{entry.relevance_score}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{entry.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 line-clamp-3">{entry.content}</p>

                  <div className="flex flex-wrap gap-1">
                    {entry.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {entry.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{entry.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-slate-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {entry.source_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(entry.source_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
