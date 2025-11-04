import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { checkRateLimit, incrementRateLimit, logApiUsage } from './rate-limiter';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
}

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Missing or invalid authorization header'
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid or expired token'
        },
        { status: 401 }
      );
    }

    return await handler(request, user.id);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Authentication failed'
      },
      { status: 500 }
    );
  }
}

export async function withRateLimit(
  request: NextRequest,
  userId: string,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const rateLimitCheck = await checkRateLimit(userId);

    if (!rateLimitCheck.allowed) {
      await logApiUsage(
        userId,
        request.nextUrl.pathname,
        request.method,
        429,
        0
      );

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: rateLimitCheck.message || 'Rate limit exceeded',
          rateLimit: {
            remaining: rateLimitCheck.remaining,
            limit: rateLimitCheck.limit,
            resetAt: rateLimitCheck.resetAt.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
          },
        }
      );
    }

    await incrementRateLimit(userId);

    const response = await handler(request, userId);

    response.headers.set('X-RateLimit-Limit', rateLimitCheck.limit.toString());
    response.headers.set('X-RateLimit-Remaining', (rateLimitCheck.remaining - 1).toString());
    response.headers.set('X-RateLimit-Reset', rateLimitCheck.resetAt.toISOString());

    await logApiUsage(
      userId,
      request.nextUrl.pathname,
      request.method,
      response.status,
      rateLimitCheck.remaining - 1
    );

    return response;
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Rate limit check failed',
      },
      { status: 500 }
    );
  }
}

export async function withAuthAndRateLimit(
  request: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req, userId) => {
    return withRateLimit(req, userId, handler);
  });
}
