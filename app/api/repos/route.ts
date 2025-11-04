import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit, ApiResponse } from '@/lib/api-middleware';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withAuthAndRateLimit(request, async (req, userId) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '30');
      const language = searchParams.get('language');

      let query = supabase
        .from('github_repos')
        .select('*')
        .order('stars', { ascending: false });

      if (language) {
        query = query.eq('language', language);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to fetch repositories',
          },
          { status: 500 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          repos: data,
          count: data.length,
        },
      });
    } catch (error) {
      console.error('Error in repos API:', error);
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
