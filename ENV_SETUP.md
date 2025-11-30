# Environment Setup Guide

## Overview
This project uses environment variables to configure backend services, APIs, and database connections. The configuration is split into three files:

- `.env` - Local development configuration (already present)
- `.env.example` - Template with all available options and descriptions
- `.env.local` - Production-ready template with strong security defaults

## Required Setup Steps

### 1. Configure Local Development Environment

The `.env` file already exists with basic configuration. Ensure these values match your local setup:

```bash
# Database - must match your PostgreSQL instance
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_bot
DB_USER=postgres
DB_PASSWORD=your_password

# Redis - must match your Redis instance
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password (leave empty if no password)
REDIS_DB=0

# JWT Secret - used for user authentication
JWT_SECRET=your_jwt_secret_key (use a strong, random string)

# Frontend URL - where your Next.js frontend is running
FRONTEND_URL=http://localhost:3000

# Trading APIs
TRADINGVIEW_API_KEY=your_tradingview_key (optional, for TradingView integration)
BINANCE_API_KEY=your_binance_key (for Binance data)
BINANCE_SECRET_KEY=your_binance_secret (for Binance trading)
```

### 2. Required Services

Before running the backend, ensure these services are running:

#### PostgreSQL Database
```bash
# On Windows with WSL2/Docker:
docker run -d \
  --name trading-bot-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=trading_bot \
  -p 5432:5432 \
  postgres:15-alpine

# Or use your local PostgreSQL installation
```

#### Redis Cache
```bash
# On Windows with Docker:
docker run -d \
  --name trading-bot-redis \
  -p 6379:6379 \
  redis:7-alpine

# Or use your local Redis installation
```

### 3. Generate Secure JWT Secret

For development, you can use any string. For production, generate a cryptographically secure secret:

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output to JWT_SECRET in your .env file
```

### 4. Setup Trading API Keys

#### Binance (Required for Market Data)
1. Go to https://www.binance.com/en/account/login
2. Navigate to API Management
3. Create a new API key
4. Copy `API Key` and `API Secret` to your `.env` file

#### TradingView (Optional)
1. Get an API key from TradingView if using their feeds
2. Add to `.env` as `TRADINGVIEW_API_KEY`

### 5. Email Notifications (Optional)

For email alerts, configure SMTP:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password  # Use app password, not account password
ADMIN_EMAIL=admin@example.com
ENABLE_EMAIL_NOTIFICATIONS=false  # Set to true when ready
```

### 6. Feature Flags

Control which features are enabled:

```bash
ENABLE_BACKTESTING=true        # Run historical backtests
ENABLE_LIVE_TRADING=false      # Execute real trades (CAREFUL!)
ENABLE_WEBSOCKET_FEEDS=true    # Real-time market data
ENABLE_EMAIL_NOTIFICATIONS=false # Send email alerts
```

## Environment Variables Reference

### Core
- `NODE_ENV`: `development` or `production`
- `PORT`: Backend server port (default: 3001)
- `FRONTEND_URL`: Frontend application URL

### Database
- `DATABASE_URL`: Full PostgreSQL connection string (optional, builds from DB_*)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password

### Redis
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password (leave empty if none)
- `REDIS_DB`: Redis database number
- `REDIS_KEY_PREFIX`: Key prefix for all Redis keys

### Authentication
- `JWT_SECRET`: Secret key for JWT tokens (min 32 chars in production)
- `JWT_EXPIRY`: Token expiration time (default: 7d)
- `REFRESH_TOKEN_SECRET`: Secret for refresh tokens

### Trading APIs
- `BINANCE_API_KEY`: Binance API key
- `BINANCE_SECRET_KEY`: Binance API secret
- `TRADINGVIEW_API_KEY`: TradingView API key

### Logging
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error`
- `ENABLE_FILE_LOGGING`: Write logs to file
- `LOG_DIR`: Directory for log files

### ML/Data
- `ML_MODEL_PATH`: Path to trained ML models
- `DATA_PROCESSOR_PATH`: Path to data processor script

## Quick Start

1. Update `.env` with your local service credentials
2. Start PostgreSQL and Redis
3. Run database migrations (if applicable)
4. Start the backend: `npm start`
5. Start the frontend: `npm run dev`

## Production Deployment

For production, use `.env.local` as a template:

1. Generate strong, random secrets for JWT_SECRET and REFRESH_TOKEN_SECRET
2. Use managed database services (AWS RDS, etc.)
3. Use managed Redis services (AWS ElastiCache, etc.)
4. Set `NODE_ENV=production`
5. Set `ENABLE_LIVE_TRADING=true` only if you're confident
6. Use environment secrets management (AWS Secrets Manager, GitHub Secrets, etc.)
7. Never commit `.env` or `.env.local` to version control

## Troubleshooting

### "Connection refused" errors
- Verify PostgreSQL is running on `DB_HOST:DB_PORT`
- Verify Redis is running on `REDIS_HOST:REDIS_PORT`
- Check credentials in `.env` match your services

### "Invalid JWT" errors
- Regenerate JWT_SECRET if changed
- Existing tokens will be invalidated

### "API key invalid" errors
- Verify Binance API keys are correct and active
- Check IP whitelist in Binance dashboard (if enabled)
- Ensure API key has appropriate permissions

### Redis connection timeout
- Check REDIS_HOST and REDIS_PORT
- Verify REDIS_PASSWORD is correct (empty string if none)
- Ensure Redis service is running and accessible
