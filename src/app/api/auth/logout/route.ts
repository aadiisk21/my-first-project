import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cacheService } from '@/lib/database/redis';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No token provided',
        },
        { status: 401 }
      );
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
      iat: number;
      exp: number;
    };

    // Remove from cache
    await cacheService.deleteUserSession(decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to logout',
      },
      { status: 500 }
    );
  }
}
