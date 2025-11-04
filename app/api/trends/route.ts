import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit, ApiResponse } from '@/lib/api-middleware';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withAuthAndRateLimit(request, async (req, userId) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '20');
      const category = searchParams.get('category');

      let query = supabase
        .from('x_trends')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Failed to fetch trends',
          },
          { status: 500 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          trends: data,
          count: data.length,
        },
      });
    } catch (error) {
      console.error('Error in trends API:', error);
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
