'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'category' | 'source';
  usageCount: number;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters?: any) => void;
  placeholder?: string;
  showTrending?: boolean;
  initialQuery?: string;
}

export default function AdvancedSearch({
  onSearch,
  placeholder = 'Search trends, repos, and knowledge...',
  showTrending = true,
  initialQuery = '',
}: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (showTrending) {
      fetchTrendingSearches();
    }
  }, [showTrending]);

  useEffect(() => {
    if (query.length > 1) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/search?action=suggestions&query=${encodeURIComponent(searchQuery)}&limit=8`
      );

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingSearches = async () => {
    try {
      const response = await fetch('/api/search?action=trending-searches&limit=5');

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setTrendingSearches(data.data.trendingSearches || []);
      }
    } catch (error) {
      console.error('Error fetching trending searches:', error);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch(finalQuery.trim());
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSearch(suggestions[selectedIndex].text);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'query':
        return <Search className="h-4 w-4" />;
      case 'tag':
        return <Filter className="h-4 w-4" />;
      case 'category':
        return <Filter className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length > 1 || trendingSearches.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className="pl-10 pr-24 h-12 text-base"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => handleSearch()}
            disabled={!query.trim()}
            className="h-8"
          >
            Search
          </Button>
        </div>
      </div>

      {showSuggestions && (suggestions.length > 0 || trendingSearches.length > 0) && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg border shadow-lg max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    index === selectedIndex
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-gray-400">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <span className="flex-1 text-left text-sm">{suggestion.text}</span>
                  <Badge variant="secondary" className="text-xs">
                    {suggestion.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && query.length > 1 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No suggestions found
            </div>
          )}

          {!loading && trendingSearches.length > 0 && query.length <= 1 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Trending Searches
              </div>
              {trendingSearches.map((search) => (
                <button
                  key={search.text}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 text-left text-sm">{search.text}</span>
                  <span className="text-xs text-gray-500">{search.usageCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
