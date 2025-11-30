import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/database/connection';
import { cacheService } from '@/lib/database/redis';

interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
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
  preferences?: {
    theme?: string;
    timezone?: string;
    currency?: string;
    language?: string;
    defaultTimeframe?: string;
    chartSettings?: unknown;
    alertSettings?: unknown;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, firstName, lastName } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username, email, and password are required',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email or username already exists',
        },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await executeQuery<User>(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, first_name, last_name, created_at`,
      [username, email, hashedPassword, firstName, lastName]
    );

    const user = result[0] as User;

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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register user',
      },
      { status: 500 }
    );
  }
}
