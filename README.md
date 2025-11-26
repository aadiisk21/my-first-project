# AI Trading Bot - Cryptocurrency Signal Generation Platform

A comprehensive AI-powered trading bot website that provides real-time cryptocurrency signals with technical analysis and machine learning predictions.

## Features

### 🚀 Core Functionality
- **Real-time Market Data**: Live price feeds from multiple exchanges
- **AI Signal Generation**: Machine learning-powered trading signals with confidence scoring
- **Advanced Technical Analysis**: RSI, MACD, Bollinger Bands, Stochastic indicators
- **Interactive Charts**: Custom-built trading chart with technical overlays
- **Multi-timeframe Support**: 1m, 5m, 15m, 30m, 1h, 4h, 1d timeframes
- **Risk Management**: Configurable risk tolerance levels (Conservative, Moderate, Aggressive)

### 🤖 AI/ML Components
- **LSTM Price Prediction**: TensorFlow models for forecasting price movements
- **Technical Indicators**: Comprehensive market data preprocessing pipeline
- **Signal Confidence**: AI-calculated confidence scores for each signal
- **Pattern Recognition**: CNN-based chart pattern analysis
- **Backtesting Engine**: Historical strategy validation and performance metrics

### 💹 Trading Features
- **Multi-Pair Support**: BTC, ETH, and 50+ cryptocurrency pairs
- **Signal Types**: Buy, Sell, and Hold recommendations
- **Entry/Exit Points**: Stop-loss and take-profit level suggestions
- **Market Overview**: Top gainers, losers, and volume leaders
- **Sentiment Analysis**: Market sentiment indicators and scoring

### 🎨 User Interface
- **Responsive Design**: Mobile-friendly with Tailwind CSS
- **Dark/Light Themes**: Automatic theme switching support
- **Real-time Updates**: WebSocket-based live data streaming
- **Interactive Dashboard**: Market overview with signal history
- **Signal Filtering**: Advanced filtering by type, risk, confidence, and pair

### 🔧 Technical Architecture
- **Frontend**: Next.js 14+ with TypeScript and Zustand state management
- **Backend**: Node.js/Express.js with WebSocket support
- **Database**: PostgreSQL with Redis caching layer
- **ML Engine**: Python with TensorFlow/Keras for signal generation
- **API Integration**: Binance and TradingView API connections
- **Security**: JWT authentication, rate limiting, and CORS protection

## Project Structure

```
my-first-project/
├── src/                          # Frontend source code
│   ├── app/                      # Next.js app router pages
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx             # Root layout with navigation
│   │   └── globals.css            # Global styles with Tailwind
│   ├── components/                # React components
│   │   ├── Navigation.tsx         # Main navigation bar
│   │   ├── TradingChart.tsx       # Interactive trading chart
│   │   ├── SignalCard.tsx         # Individual signal display
│   │   ├── SignalFeed.tsx         # Signal list and filtering
│   │   ├── MarketOverview.tsx     # Market stats and sentiment
│   │   ├── QuickStats.tsx         # Dashboard statistics
│   │   └── ThemeProvider.tsx      # Theme management
│   ├── stores/                   # Zustand state management
│   │   └── useTradingStore.ts     # Global trading state
│   └── types/                    # TypeScript type definitions
│       └── index.ts                # Core types and interfaces
├── backend/                       # Backend API server
│   ├── server.ts                 # Express.js server setup
│   ├── api/                      # API route handlers
│   │   ├── trading.ts            # Market data endpoints
│   │   ├── signals.ts            # Signal management endpoints
│   │   └── users.ts              # User authentication endpoints
│   ├── services/                 # Business logic services
│   │   ├── tradingViewService.ts  # TradingView API integration
│   │   ├── binanceService.ts     # Binance API integration
│   │   └── signalGenerator.ts   # AI signal generation engine
│   ├── websocket/                # WebSocket handlers
│   │   └── handler.ts            # Real-time data streaming
│   ├── middleware/               # Express middleware
│   │   ├── errorHandler.ts       # Global error handling
│   │   └── rateLimiter.ts       # API rate limiting
│   ├── database/                 # Database connections
│   │   ├── connection.ts         # PostgreSQL connection
│   │   └── redis.ts              # Redis caching service
│   └── utils/                    # Utility functions
│       └── logger.ts             # Application logging
└── ml/                          # Machine learning components
    ├── data_processor.py         # Market data preprocessing
    ├── models.py                 # TensorFlow LSTM models
    ├── signal_generator.py       # AI signal generation logic
    └── trainer.py                # Model training pipeline
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ with pip
- PostgreSQL database
- Redis server
- Environment variables configuration

### Frontend Setup
```bash
cd my-first-project
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm start
```

### ML Environment Setup
```bash
cd ml
pip install -r requirements.txt
python models.py  # Train the LSTM models
```

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_bot
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT
JWT_SECRET=your_jwt_secret_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Trading APIs
TRADINGVIEW_API_KEY=your_tradingview_key
BINANCE_API_KEY=your_binance_key
BINANCE_SECRET_KEY=your_binance_secret
```

## Key Features Implementation

### 1. Real-time Trading Chart
- Custom canvas-based candlestick chart implementation
- Technical indicator overlays (SMA, EMA, Bollinger Bands, RSI, MACD)
- Interactive tooltips and crosshair
- Multiple timeframe support
- Volume chart integration

### 2. AI Signal Generation
- Multi-feature LSTM model for price prediction
- Technical indicator analysis (RSI, MACD, Stochastic, Bollinger Bands)
- Pattern recognition using CNN models
- Ensemble prediction with confidence scoring
- Risk-adjusted position sizing recommendations

### 3. WebSocket Real-time Data
- Live price updates streaming
- Signal push notifications
- Connection management and cleanup
- Authentication middleware
- Rate limiting and security

### 4. Database Schema
- Users table for authentication and preferences
- Signals table for generated trading signals
- Market data table for historical price data
- Performance logs for model accuracy tracking
- User interactions for signal engagement

## API Endpoints

### Trading Data
- `GET /api/trading/pairs` - Get available trading pairs
- `GET /api/trading/price/:symbol` - Get current price data
- `GET /api/trading/history/:symbol` - Get historical market data
- `GET /api/trading/indicators/:symbol` - Calculate technical indicators
- `GET /api/trading/overview` - Market overview statistics

### Signal Management
- `GET /api/signals` - Get trading signals with filtering
- `POST /api/signals/generate` - Generate new AI signals
- `GET /api/signals/:id` - Get specific signal details
- `PUT /api/signals/:id` - Update signal
- `DELETE /api/signals/:id` - Delete signal

### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `POST /api/users/logout` - User logout
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/preferences` - Update user preferences

## Machine Learning Pipeline

### Data Processing
- Real-time market data ingestion from exchanges
- Feature engineering with 50+ technical indicators
- Data normalization and scaling
- Sliding window preparation for time series models
- Outlier detection and data quality validation

### Model Architecture
- 3-layer LSTM network with dropout
- CNN for chart pattern recognition
- Ensemble method combining multiple signals
- Confidence scoring through softmax activation
- Automatic model retraining pipeline

## Deployment

### Production Setup
- Docker containerization for all services
- Kubernetes cluster orchestration
- Load balancing and auto-scaling
- Database replication and backup
- CDN integration for static assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

**Risk Warning**: Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. This software provides educational and informational purposes only. Past performance is not indicative of future results. Always do your own research and consult with a qualified financial advisor before making any investment decisions.
