'use client';

import { useState, useEffect } from 'react';
import { Filter, X, Calendar, TrendingUp, Star, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export interface FilterValues {
  categories: string[];
  tags: string[];
  languages: string[];
  sources: string[];
  dateRange: string;
  dateFrom?: string;
  dateTo?: string;
  minEngagement: number;
  sortBy: string;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterValues) => void;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    languages: Array<{ name: string; count: number }>;
    sources: Array<{ name: string; count: number }>;
  };
  initialFilters?: Partial<FilterValues>;
}

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: Star },
  { value: 'trending', label: 'Trending Now', icon: TrendingUp },
  { value: 'recent', label: 'Most Recent', icon: Calendar },
  { value: 'popular', label: 'Most Popular', icon: Star },
  { value: 'velocity', label: 'Fastest Growing', icon: TrendingUp },
];

const SOURCE_OPTIONS = [
  { value: 'x_trends', label: 'X Trends', color: 'blue' },
  { value: 'github_repos', label: 'GitHub Repos', color: 'green' },
  { value: 'knowledge_entries', label: 'Knowledge Base', color: 'purple' },
];

export default function AdvancedFilters({
  onFiltersChange,
  facets,
  initialFilters,
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    categories: initialFilters?.categories || [],
    tags: initialFilters?.tags || [],
    languages: initialFilters?.languages || [],
    sources: initialFilters?.sources || ['x_trends', 'github_repos', 'knowledge_entries'],
    dateRange: initialFilters?.dateRange || 'all',
    dateFrom: initialFilters?.dateFrom,
    dateTo: initialFilters?.dateTo,
    minEngagement: initialFilters?.minEngagement || 0,
    sortBy: initialFilters?.sortBy || 'relevance',
  });

  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [languagesOpen, setLanguagesOpen] = useState(true);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  const updateFilters = (key: keyof FilterValues, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'categories' | 'tags' | 'languages' | 'sources', value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      tags: [],
      languages: [],
      sources: ['x_trends', 'github_repos', 'knowledge_entries'],
      dateRange: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      minEngagement: 0,
      sortBy: 'relevance',
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.sources.length < 3) count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.minEngagement > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  };

  const calculateDateRange = (range: string) => {
    const now = new Date();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    switch (range) {
      case 'today':
        dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        dateTo = new Date().toISOString();
        break;
      case '24h':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        dateFrom = undefined;
        dateTo = undefined;
    }

    return { dateFrom, dateTo };
  };

  const handleDateRangeChange = (value: string) => {
    const { dateFrom, dateTo } = calculateDateRange(value);
    setFilters((prev) => ({ ...prev, dateRange: value, dateFrom, dateTo }));
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold">Filters</h3>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </div>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-gray-600 dark:text-gray-400">Sort By</Label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilters('sortBy', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data Sources</Label>
            {SOURCE_OPTIONS.map((source) => (
              <div key={source.value} className="flex items-center space-x-2">
                <Checkbox
                  id={source.value}
                  checked={filters.sources.includes(source.value)}
                  onCheckedChange={() => toggleArrayFilter('sources', source.value)}
                />
                <Label
                  htmlFor={source.value}
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full bg-${source.color}-500`} />
                  {source.label}
                </Label>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Minimum Engagement</Label>
            <div className="space-y-2">
              <Slider
                value={[filters.minEngagement]}
                onValueChange={(value) => updateFilters('minEngagement', value[0])}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                {filters.minEngagement === 0
                  ? 'Any'
                  : `${filters.minEngagement.toLocaleString()}+`}
              </div>
            </div>
          </div>

          {facets && (
            <>
              {facets.categories && facets.categories.length > 0 && (
                <>
                  <Separator />
                  <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium cursor-pointer">
                          Categories ({filters.categories.length})
                        </Label>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {categoriesOpen ? '−' : '+'}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-3">
                      {facets.categories.slice(0, 8).map((category) => (
                        <div key={category.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${category.name}`}
                            checked={filters.categories.includes(category.name)}
                            onCheckedChange={() => toggleArrayFilter('categories', category.name)}
                          />
                          <Label
                            htmlFor={`cat-${category.name}`}
                            className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                          >
                            <span className="capitalize">{category.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category.count}
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {facets.tags && facets.tags.length > 0 && (
                <>
                  <Separator />
                  <Collapsible open={tagsOpen} onOpenChange={setTagsOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium cursor-pointer">
                          Tags ({filters.tags.length})
                        </Label>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {tagsOpen ? '−' : '+'}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-3">
                      {facets.tags.slice(0, 12).map((tag) => (
                        <div key={tag.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.name}`}
                            checked={filters.tags.includes(tag.name)}
                            onCheckedChange={() => toggleArrayFilter('tags', tag.name)}
                          />
                          <Label
                            htmlFor={`tag-${tag.name}`}
                            className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                          >
                            <span>{tag.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {tag.count}
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {facets.languages && facets.languages.length > 0 && (
                <>
                  <Separator />
                  <Collapsible open={languagesOpen} onOpenChange={setLanguagesOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium cursor-pointer">
                          Languages ({filters.languages.length})
                        </Label>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {languagesOpen ? '−' : '+'}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-3">
                      {facets.languages.slice(0, 10).map((language) => (
                        <div key={language.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`lang-${language.name}`}
                            checked={filters.languages.includes(language.name)}
                            onCheckedChange={() => toggleArrayFilter('languages', language.name)}
                          />
                          <Label
                            htmlFor={`lang-${language.name}`}
                            className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                          >
                            <span>{language.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {language.count}
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
