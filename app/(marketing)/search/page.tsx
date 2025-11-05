'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdvancedSearch from '@/components/advanced-search';
import AdvancedFilters, { FilterValues } from '@/components/advanced-filters';
import SearchResults, { SearchResult } from '@/components/search-results';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, SlidersHorizontal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    categories: [],
    tags: [],
    languages: [],
    sources: ['x_trends', 'github_repos', 'knowledge_entries'],
    dateRange: 'all',
    minEngagement: 0,
    sortBy: 'relevance',
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, filters, 0);
    }
  }, []);

  const performSearch = async (
    searchQuery: string,
    searchFilters: FilterValues,
    searchOffset: number = 0,
    append: boolean = false
  ) => {
    try {
      setLoading(true);

      const requestBody = {
        query: searchQuery,
        categories: searchFilters.categories.length > 0 ? searchFilters.categories : undefined,
        tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
        languages: searchFilters.languages.length > 0 ? searchFilters.languages : undefined,
        sources: searchFilters.sources.length > 0 ? searchFilters.sources : undefined,
        dateFrom: searchFilters.dateFrom,
        dateTo: searchFilters.dateTo,
        minEngagement: searchFilters.minEngagement > 0 ? searchFilters.minEngagement : undefined,
        sortBy: searchFilters.sortBy,
        limit,
        offset: searchOffset,
      };

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (data.success) {
        const searchResults = data.data.results || [];

        if (append) {
          setResults((prev) => [...prev, ...searchResults]);
        } else {
          setResults(searchResults);
        }

        setFacets(data.data.facets || null);
        setTotal(data.data.total || 0);
        setHasMore(searchResults.length === limit);
        setOffset(searchOffset + searchResults.length);

        if (searchResults.length === 0 && !append) {
          toast.info('No results found. Try adjusting your filters.');
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to perform search. Please try again.');
      setResults([]);
      setTotal(0);
      setFacets(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setOffset(0);
    performSearch(searchQuery, filters, 0, false);

    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery);
    router.push(url.pathname + url.search);
  };

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    if (query) {
      setOffset(0);
      performSearch(query, newFilters, 0, false);
    }
  };

  const handleLoadMore = () => {
    if (query && !loading && hasMore) {
      performSearch(query, filters, offset, true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="border-b bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <AdvancedSearch
                onSearch={handleSearch}
                placeholder="Search across X trends, GitHub repos, and knowledge..."
                showTrending={true}
                initialQuery={initialQuery}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {(filters.categories.length +
                    filters.tags.length +
                    filters.languages.length) >
                    0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {filters.categories.length +
                        filters.tags.length +
                        filters.languages.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <AdvancedFilters
                  onFiltersChange={handleFiltersChange}
                  facets={facets}
                  initialFilters={filters}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <AdvancedFilters
                onFiltersChange={handleFiltersChange}
                facets={facets}
                initialFilters={filters}
              />
            </div>
          </aside>

          <main>
            {loading && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Searching across all sources...
                </p>
              </div>
            ) : !query ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="text-blue-600 mb-6">
                  <Sparkles className="h-20 w-20" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Discover Trending Topics
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                  Search across X trends, GitHub repositories, and our curated knowledge base
                  to discover what's hot right now.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch('ai')}
                  >
                    AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch('javascript')}
                  >
                    JavaScript
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch('machine learning')}
                  >
                    Machine Learning
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch('react')}
                  >
                    React
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch('python')}
                  >
                    Python
                  </Button>
                </div>
              </div>
            ) : (
              <SearchResults
                results={results}
                total={total}
                loading={loading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                highlightQuery={query}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
