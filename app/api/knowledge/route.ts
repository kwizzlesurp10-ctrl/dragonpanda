import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit, ApiResponse } from '@/lib/api-middleware';
import { getKnowledgeEntries, KnowledgeFilters } from '@/lib/knowledge-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withAuthAndRateLimit(request, async (req, userId) => {
    try {
      const { searchParams } = new URL(req.url);

      const filters: KnowledgeFilters = {
        category: searchParams.get('category') || undefined,
        search: searchParams.get('search') || undefined,
        minRelevance: searchParams.get('minRelevance')
          ? parseInt(searchParams.get('minRelevance')!)
          : undefined,
      };

      const tagsParam = searchParams.get('tags');
      if (tagsParam) {
        filters.tags = tagsParam.split(',').map(t => t.trim());
      }

      const limit = parseInt(searchParams.get('limit') || '50');
      const entries = await getKnowledgeEntries(filters, limit);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          entries,
          count: entries.length,
        },
      });
    } catch (error) {
      console.error('Error in knowledge API:', error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 }
      );
    }
  });
}
