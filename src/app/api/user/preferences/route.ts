import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { executeQuery } from '@/lib/database/connection';
import { cacheService } from '@/lib/database/redis';

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

export async function PUT(req: NextRequest) {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
    };

    const {
      theme,
      timezone,
      currency,
      language,
      defaultTimeframe,
      chartSettings,
      alertSettings,
    } = await req.json();

    // Update preferences in database
    await executeQuery(
      `INSERT INTO user_preferences (user_id, theme, timezone, currency, language, default_timeframe, chart_settings, alert_settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         theme = EXCLUDED.theme,
         timezone = EXCLUDED.timezone,
         currency = EXCLUDED.currency,
         language = EXCLUDED.language,
         default_timeframe = EXCLUDED.default_timeframe,
         chart_settings = EXCLUDED.chart_settings,
         alert_settings = EXCLUDED.alert_settings,
         updated_at = NOW()`,
      [
        decoded.userId,
        theme,
        timezone,
        currency,
        language,
        defaultTimeframe,
        JSON.stringify(chartSettings),
        JSON.stringify(alertSettings),
      ]
    );

    // Update cached session
    try {
      const cachedUser = (await cacheService.getUserSession(
        decoded.userId
      )) as CachedUserSession | null;

      if (cachedUser) {
        const typedCachedUser = cachedUser as CachedUserSession;
        typedCachedUser.preferences = {
          theme,
          timezone,
          currency,
          language,
          defaultTimeframe,
          chartSettings,
          alertSettings,
        };
        await cacheService.setUserSession(decoded.userId, typedCachedUser);
      }
    } catch (cacheError) {
      // Cache update failed, that's okay
      console.warn('Failed to update user cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Preferences updated successfully',
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update preferences',
      },
      { status: 500 }
    );
  }
}
