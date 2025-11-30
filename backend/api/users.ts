import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CustomError } from '../middleware/errorHandler';
import { executeQuery, executeTransaction } from '../database/connection';
import { cacheService } from '../database/redis';

const router = express.Router();

// Type for cached user session
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

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      throw new CustomError('Username, email, and password are required', 400);
    }

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.length > 0) {
      throw new CustomError('User with this email or username already exists', 409);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await executeQuery(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, first_name, last_name, created_at`,
      [username, email, hashedPassword, firstName, lastName]
    );

    const user = result[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Cache user session
    await cacheService.setUserSession(user.id, {
      userId: user.id,
      username: user.username,
      email: user.email,
      token
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register user'
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    // Find user
    const result = await executeQuery(
      'SELECT id, username, email, password_hash, first_name, last_name, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.length === 0) {
      throw new CustomError('Invalid email or password', 401);
    }

    const user = result[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Cache user session
    await cacheService.setUserSession(user.id, {
      userId: user.id,
      username: user.username,
      email: user.email,
      token
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to login'
    });
  }
});

// User logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new CustomError('No token provided', 401);
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Remove from cache
    await cacheService.deleteUserSession(decoded.userId);

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to logout'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new CustomError('No token provided', 401);
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from cache or database
    let cachedUser = await cacheService.getUserSession(decoded.userId);

    if (!cachedUser) {
      const result = await executeQuery(
        'SELECT id, username, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = result[0];
      cachedUser = {
        userId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    }

    res.json({
      success: true,
      data: {
        user: cachedUser
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user profile'
    });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { theme, timezone, currency, language, defaultTimeframe, chartSettings, alertSettings } = req.body;

    if (!token) {
      throw new CustomError('No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

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
        JSON.stringify(alertSettings)
      ]
    );

    // Update cached session
    const cachedUser = await cacheService.getUserSession(decoded.userId);
    if (cachedUser) {
      const typedCachedUser = cachedUser as CachedUserSession;
      typedCachedUser.preferences = {
        theme,
        timezone,
        currency,
        language,
        defaultTimeframe,
        chartSettings,
        alertSettings
      };
      await cacheService.setUserSession(decoded.userId, typedCachedUser);
    }

    res.json({
      success: true,
      data: {
        message: 'Preferences updated successfully'
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences'
    });
  }
});

export default router;