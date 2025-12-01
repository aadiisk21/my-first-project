"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.getPool = getPool;
exports.getClient = getClient;
exports.executeQuery = executeQuery;
exports.executeTransaction = executeTransaction;
exports.closeDatabase = closeDatabase;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
let pool;
async function connectDatabase() {
    try {
        const config = {
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
        pool = new pg_1.Pool({
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
        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger_1.logger.info('✅ Database connected successfully');
        return pool;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to connect to database:', error);
        throw error;
    }
}
function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call connectDatabase() first.');
    }
    return pool;
}
async function getClient() {
    try {
        const client = await getPool().connect();
        return client;
    }
    catch (error) {
        logger_1.logger.error('Failed to get database client:', error);
        throw error;
    }
}
async function executeQuery(text, params) {
    let client = null;
    try {
        client = await getClient();
        const result = await client.query(text, params);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Database query error:', error);
        throw error;
    }
    finally {
        if (client) {
            client.release();
        }
    }
}
async function executeTransaction(callback) {
    let client = null;
    try {
        client = await getClient();
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        logger_1.logger.error('Transaction error:', error);
        throw error;
    }
    finally {
        if (client) {
            client.release();
        }
    }
}
async function closeDatabase() {
    if (pool) {
        await pool.end();
        logger_1.logger.info('Database connection closed');
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
//# sourceMappingURL=connection.js.map