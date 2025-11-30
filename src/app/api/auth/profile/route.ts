import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/database/connection';
import { cacheService } from '@/lib/database/redis';

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
}

export async function GET(req: NextRequest) {
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
    };

    // Get user from cache or database
    let cachedUser: unknown | null = null;
    try {
      cachedUser = await cacheService.getUserSession(decoded.userId);
    } catch (cacheError) {
      // Redis might not be available, that's okay - we'll fetch from DB
      console.warn('Cache unavailable, fetching from database');
    }

    if (!cachedUser) {
      const result = await executeQuery<User>(
        'SELECT id, username, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      const user = result[0] as User;
      cachedUser = {
        userId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        user: cachedUser,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get user profile',
      },
      { status: 500 }
    );
  }
}
