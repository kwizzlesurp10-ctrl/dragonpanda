'use client';

import { useState } from 'react';
import { ExternalLink, Star, TrendingUp, GitBranch, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface SearchResult {
  id: string;
  type: 'x_trend' | 'github_repo' | 'knowledge_entry';
  title: string;
  description: string;
  url?: string;
  category?: string;
  tags?: string[];
  language?: string;
  engagement: number;
  trendingScore?: number;
  velocityScore?: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  highlightQuery?: string;
}

export default function SearchResults({
  results,
  total,
  loading = false,
  onLoadMore,
  hasMore = false,
  highlightQuery,
}: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'x_trend':
        return <TrendingUp className="h-4 w-4" />;
      case 'github_repo':
        return <GitBranch className="h-4 w-4" />;
      case 'knowledge_entry':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'x_trend':
        return 'X Trend';
      case 'github_repo':
        return 'GitHub Repo';
      case 'knowledge_entry':
        return 'Knowledge';
      default:
        return 'Item';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'x_trend':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'github_repo':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'knowledge_entry':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const highlightText = (text: string, query?: string) => {
    if (!query || query.trim() === '') return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-800 font-semibold rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const formatEngagement = (engagement: number, type: string) => {
    if (type === 'x_trend') {
      return `${engagement.toLocaleString()} posts`;
    } else if (type === 'github_repo') {
      return `${engagement.toLocaleString()} stars`;
    } else {
      return `Score: ${engagement}`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (results.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-gray-400 mb-4">
          <Sparkles className="h-16 w-16" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No results found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Try adjusting your search query or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span>
            Showing {results.length} of {total.toLocaleString()} results
          </span>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => {
          const isExpanded = expandedResults.has(result.id);
          return (
            <Card
              key={result.id}
              className="hover:shadow-md transition-shadow overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getTypeColor(result.type)}`}
                      >
                        <span className="mr-1">{getTypeIcon(result.type)}</span>
                        {getTypeLabel(result.type)}
                      </Badge>
                      {result.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {result.category}
                        </Badge>
                      )}
                      {result.language && (
                        <Badge variant="outline" className="text-xs">
                          {result.language}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-tight break-words">
                      {highlightText(result.title, highlightQuery)}
                    </CardTitle>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {result.trendingScore && (
                      <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>{Math.round(result.trendingScore)}</span>
                      </div>
                    )}
                    {result.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(result.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className={`text-sm text-gray-600 dark:text-gray-400 mb-3 ${!isExpanded && 'line-clamp-2'}`}>
                  {highlightText(result.description, highlightQuery)}
                </p>

                {result.description.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(result.id)}
                    className="text-xs mb-2 -ml-2"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                    <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </Button>
                )}

                {result.tags && result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {result.tags.slice(0, isExpanded ? undefined : 5).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {!isExpanded && result.tags.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{result.tags.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {formatEngagement(result.engagement, result.type)}
                    </span>
                    {result.velocityScore && result.velocityScore > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        Velocity: {Math.round(result.velocityScore)}
                      </span>
                    )}
                  </div>
                  <span>{formatTimestamp(result.timestamp)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasMore && onLoadMore && (
        <div className="flex justify-center py-6">
          <Button onClick={onLoadMore} disabled={loading} variant="outline">
            {loading ? 'Loading...' : 'Load More Results'}
          </Button>
        </div>
      )}
    </div>
  );
}
