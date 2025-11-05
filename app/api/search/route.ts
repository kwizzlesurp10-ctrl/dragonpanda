import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit, ApiResponse } from '@/lib/api-middleware';
import {
  performUnifiedSearch,
  getSearchSuggestions,
  getTrendingSearches,
  getTrendingItems,
  getRelatedItems,
  calculateAndStoreTrendingScores,
  SearchFilters,
} from '@/lib/search-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withAuthAndRateLimit(request, async (req, userId) => {
    try {
      const body = await req.json();
      const {
        query,
        categories,
        tags,
        languages,
        sources,
        dateFrom,
        dateTo,
        minEngagement,
        sortBy,
        limit,
        offset,
      } = body;

      const filters: SearchFilters = {
        query,
        categories,
        tags,
        languages,
        sources,
        dateFrom,
        dateTo,
        minEngagement,
        sortBy: sortBy || 'relevance',
        limit: limit || 50,
        offset: offset || 0,
      };

      const searchResults = await performUnifiedSearch(filters);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: searchResults,
      });
    } catch (error) {
      console.error('Error in search API:', error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to perform search',
        },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuthAndRateLimit(request, async (req, userId) => {
    try {
      const { searchParams } = new URL(req.url);
      const action = searchParams.get('action');
      const query = searchParams.get('query') || '';
      const type = searchParams.get('type');
      const itemId = searchParams.get('itemId');
      const limit = parseInt(searchParams.get('limit') || '20');

      switch (action) {
        case 'suggestions':
          const suggestions = await getSearchSuggestions(query, limit);
          return NextResponse.json<ApiResponse>({
            success: true,
            data: { suggestions },
          });

        case 'trending-searches':
          const trendingSearches = await getTrendingSearches(limit);
          return NextResponse.json<ApiResponse>({
            success: true,
            data: { trendingSearches },
          });

        case 'trending-items':
          const trendingItems = await getTrendingItems(
            type as any,
            limit
          );
          return NextResponse.json<ApiResponse>({
            success: true,
            data: { trendingItems },
          });

        case 'related':
          if (!itemId || !type) {
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: 'itemId and type are required for related items',
              },
              { status: 400 }
            );
          }

          const relatedItems = await getRelatedItems(
            itemId,
            type as any,
            limit
          );
          return NextResponse.json<ApiResponse>({
            success: true,
            data: { relatedItems },
          });

        case 'calculate-scores':
          await calculateAndStoreTrendingScores();
          return NextResponse.json<ApiResponse>({
            success: true,
            data: { message: 'Trending scores calculated successfully' },
          });

        default:
          const filters: SearchFilters = {
            query: query || undefined,
            categories: searchParams.get('categories')?.split(','),
            tags: searchParams.get('tags')?.split(','),
            languages: searchParams.get('languages')?.split(','),
            sources: searchParams.get('sources')?.split(',') as any,
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            minEngagement: searchParams.get('minEngagement')
              ? parseInt(searchParams.get('minEngagement')!)
              : undefined,
            sortBy: (searchParams.get('sortBy') as any) || 'relevance',
            limit: parseInt(searchParams.get('limit') || '50'),
            offset: parseInt(searchParams.get('offset') || '0'),
          };

          const searchResults = await performUnifiedSearch(filters);

          return NextResponse.json<ApiResponse>({
            success: true,
            data: searchResults,
          });
      }
    } catch (error) {
      console.error('Error in search API GET:', error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to process request',
        },
        { status: 500 }
      );
    }
  });
}
