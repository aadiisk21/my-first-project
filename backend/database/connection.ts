import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { logger } from '../utils/logger.ts';

let pool: Pool;

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export async function connectDatabase(): Promise<Pool> {
  try {
    // Prefer DATABASE_URL if provided (managed DBs like Render, Neon, Supabase)
    if (process.env.DATABASE_URL) {
      // Determine SSL behavior: allow explicit DB_SSL=true or auto-detect common managed providers
      const forceSsl =
        process.env.DB_SSL === 'true' ||
        /render\.com|neon|supabase|vercel\.app/.test(process.env.DATABASE_URL);
      const sslOption = forceSsl ? { rejectUnauthorized: false } : undefined;

      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslOption,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      } as any);
    } else {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'trading_bot',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

      pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl,
        max: config.max,
        idleTimeoutMillis: config.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
      });
    }

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('✅ Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function getClient(): Promise<PoolClient> {
  try {
    const client = await getPool().connect();
    return client;
  } catch (error) {
    logger.error('Failed to get database client:', error);
    throw error;
  }
}

export async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    const result = await client.query(text, params);
    return result.rows;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function executeTransaction<T = any>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});
