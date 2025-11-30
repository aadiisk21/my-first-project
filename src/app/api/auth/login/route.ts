import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/database/connection';
import { cacheService } from '@/lib/database/redis';

interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

interface CachedUserSession {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  updatedAt?: string;
  token?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Find user
    const result = await executeQuery<User>(
      'SELECT id, username, email, password_hash, first_name, last_name, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    const user = result[0] as User;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Cache user session
    const sessionData: CachedUserSession = {
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
      token,
    };

    await cacheService.setUserSession(user.id, sessionData);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to login',
      },
      { status: 500 }
    );
  }
}
