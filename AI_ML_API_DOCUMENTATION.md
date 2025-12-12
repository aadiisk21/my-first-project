# AI/ML Trading Bot - API Documentation

## 🤖 AI/ML Features Overview

This project includes a complete AI-powered trading signal generation system with:

- **LSTM Neural Networks** for price prediction
- **Technical Analysis Engine** with 50+ indicators
- **Pattern Recognition** using CNN models
- **Backtesting Framework** for strategy validation
- **Real-time Signal Generation** with confidence scoring

---

## 🚀 API Endpoints

### Trading Data Endpoints

#### Get Available Trading Pairs
```
GET /api/trading/pairs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pairs": [
      {
        "symbol": "BTCUSDT",
        "baseAsset": "BTC",
        "quoteAsset": "USDT",
        "price": 43250.50,
        "priceChangePercent": 2.45,
        "volume": 25430.45
      }
    ]
  }
}
```

#### Get Historical Market Data
```
GET /api/trading/history/:symbol?timeframe=1h&limit=100
```

**Parameters:**
- `symbol`: Trading pair (e.g., BTCUSDT)
- `timeframe`: Candle interval (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- `limit`: Number of candles to fetch (default: 100)

**Response:**
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "data": [
    {
      "timestamp": 1702368000000,
      "open": 43200.00,
      "high": 43350.00,
      "low": 43150.00,
      "close": 43280.50,
      "volume": 125.45
    }
  ]
}
```

#### Get Technical Indicators
```
GET /api/trading/indicators/:symbol?timeframe=1h
```

**Response:**
```json
{
  "success": true,
  "data": {
    "indicators": {
      "rsi": [62.5, 64.2, 63.8],
      "macd": {
        "macd": [245.6, 248.2],
        "signal": [238.2, 240.5],
        "histogram": [7.4, 7.7]
      },
      "bollingerBands": {
        "upper": [52300, 52400],
        "middle": [50800, 50900],
        "lower": [49300, 49400]
      },
      "sma": [50900, 50950],
      "ema": [51200, 51250],
      "stochastic": {
        "k": [68.5, 70.2],
        "d": [65.2, 67.1]
      }
    }
  }
}
```

---

### 🤖 AI Signal Generation Endpoints

#### Generate AI Trading Signals
```
POST /api/signals/generate
```

**Request Body:**
```json
{
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "timeframes": ["1h", "4h"],
  "riskTolerance": "MODERATE",
  "minConfidence": 60
}
```

**Parameters:**
- `symbols`: Array of trading pairs to analyze
- `timeframes`: Array of timeframes to generate signals for
- `riskTolerance`: CONSERVATIVE | MODERATE | AGGRESSIVE
- `minConfidence`: Minimum confidence threshold (0-100)

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "signal_1702368000_BTCUSDT",
        "pair": "BTCUSDT",
        "signalType": "BUY",
        "confidence": 78.5,
        "entryPrice": 43280.50,
        "stopLoss": 42850.00,
        "takeProfit": 44200.00,
        "timestamp": "2024-12-12T10:00:00.000Z",
        "timeframe": "1h",
        "indicators": {
          "rsi": 35.5,
          "macd": 125.6,
          "bollinger": 52300,
          "volume": 125.45
        },
        "technicalRationale": "RSI shows oversold conditions (35.5). MACD bullish crossover detected. Price testing lower Bollinger Band support.",
        "aiRationale": "AI model predicts BUY with 78.5% confidence. LSTM analysis indicates strong upward momentum. Pattern recognition suggests bullish reversal.",
        "riskLevel": "MEDIUM",
        "expiresAt": "2024-12-12T11:00:00.000Z"
      }
    ],
    "generated": 5,
    "filtered": 2
  }
}
```

#### Get Trading Signals
```
GET /api/signals?page=1&limit=20&signalType=BUY&minConfidence=70
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `pair`: Filter by trading pair
- `signalType`: Filter by BUY | SELL | HOLD
- `confidenceMin`: Minimum confidence threshold
- `riskLevel`: Filter by LOW | MEDIUM | HIGH
- `sortBy`: Sort field (timestamp, confidence)
- `sortOrder`: asc | desc

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Get Signal Statistics
```
GET /api/signals/stats?timeframe=1h
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalSignals": 1250,
      "successfulSignals": 875,
      "successRate": 70.0,
      "averageConfidence": 72.5,
      "averageReturn": 2.8,
      "maxDrawdown": -5.2,
      "sharpeRatio": 1.85,
      "byType": {
        "BUY": { "count": 520, "successRate": 72.3 },
        "SELL": { "count": 480, "successRate": 68.5 },
        "HOLD": { "count": 250, "successRate": 75.0 }
      }
    }
  }
}
```

---

## 🧠 Machine Learning Pipeline

### Data Processing
The ML pipeline processes market data through multiple stages:

1. **Feature Engineering**
   - 50+ technical indicators
   - Price momentum features
   - Volume profile analysis
   - Market microstructure features

2. **LSTM Model Architecture**
   ```
   Input Layer (60 timesteps × 50 features)
   ↓
   LSTM Layer 1 (128 units, dropout 0.3)
   ↓
   LSTM Layer 2 (64 units, dropout 0.3)
   ↓
   LSTM Layer 3 (32 units, dropout 0.3)
   ↓
   Dense Layer (32 units, ReLU)
   ↓
   Dense Layer (16 units, ReLU)
   ↓
   Output Layer (3 classes: SELL, HOLD, BUY)
   ```

3. **Signal Confidence Calculation**
   - ML model prediction probability
   - Technical indicator agreement score
   - Market condition assessment
   - Risk-adjusted confidence weighting

### Training the Model

```bash
cd ml
pip install -r requirements.txt

# Train LSTM model on historical data
python trainer.py

# Generate signals using trained model
python signal_generator.py '{"symbol": "BTCUSDT", "data": [...]}'
```

---

## 📊 Backtesting System

The backtesting engine validates trading strategies:

```javascript
// Backend usage
const backtester = new BacktestingEngine();

const results = await backtester.runBacktest({
  strategy: 'AI_SIGNAL',
  symbol: 'BTCUSDT',
  startDate: '2024-01-01',
  endDate: '2024-12-01',
  initialCapital: 10000,
  parameters: {
    minConfidence: 70,
    riskTolerance: 'MODERATE'
  }
});

console.log(results);
// {
//   totalReturn: 28.5,
//   sharpeRatio: 1.85,
//   maxDrawdown: -5.2,
//   winRate: 68.5,
//   trades: 245
// }
```

---

## 🔧 Advanced Analysis Services

### Fibonacci Analysis
```typescript
import { FibonacciAnalysis } from './services/fibonacciAnalysis';

const fibonacci = new FibonacciAnalysis();
const levels = await fibonacci.calculateLevels(marketData);
```

### Smart Money Concepts (SMC)
```typescript
import { SMCAnalysis } from './services/smcAnalysis';

const smc = new SMCAnalysis();
const analysis = await smc.analyze(marketData);
```

### ICT Analysis
```typescript
import { ICTAnalysis } from './services/ictAnalysis';

const ict = new ICTAnalysis();
const signals = await ict.detectSignals(marketData);
```

### Market Psychology
```typescript
import { MarketPsychologyAnalysis } from './services/marketPsychologyAnalysis';

const psychology = new MarketPsychologyAnalysis();
const sentiment = await psychology.analyzeSentiment(marketData);
```

---

## 🔐 Authentication

All protected endpoints require JWT authentication:

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure_password",
  "username": "trader123"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

# Use token in requests
Authorization: Bearer <jwt_token>
```

---

## 📈 Real-time WebSocket Streaming

Connect to WebSocket for live updates:

```javascript
const socket = io('http://localhost:3003');

// Subscribe to price updates
socket.emit('subscribe', { channel: 'prices', symbols: ['BTCUSDT'] });

// Listen for signals
socket.on('signal', (signal) => {
  console.log('New AI signal:', signal);
});

// Listen for price updates
socket.on('price_update', (data) => {
  console.log('Price update:', data);
});
```

---

## 🚦 Rate Limiting

API endpoints are rate-limited:
- **General endpoints**: 100 requests/15min
- **Signal generation**: 10 requests/hour
- **Trading endpoints**: 60 requests/minute

---

## 📝 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-12-12T10:00:00.000Z"
}
```

---

## 🎯 Usage Examples

### Generate AI Signals for Multiple Pairs
```javascript
const response = await fetch('/api/signals/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
    timeframes: ['1h', '4h'],
    riskTolerance: 'AGGRESSIVE',
    minConfidence: 75
  })
});

const { data } = await response.json();
console.log(`Generated ${data.signals.length} high-confidence signals`);
```

### Fetch and Display Signals
```javascript
const signals = await fetch('/api/signals?signalType=BUY&minConfidence=70')
  .then(res => res.json());

signals.data.signals.forEach(signal => {
  console.log(`${signal.pair}: ${signal.signalType} @ ${signal.entryPrice}`);
  console.log(`Confidence: ${signal.confidence}%`);
  console.log(`AI Analysis: ${signal.aiRationale}`);
});
```

---

## 🔥 Best Practices

1. **Signal Confidence**: Use signals with >70% confidence for live trading
2. **Risk Management**: Always set stop-loss levels
3. **Diversification**: Don't rely on signals from a single timeframe
4. **Backtesting**: Validate strategies before live deployment
5. **Position Sizing**: Adjust based on risk tolerance and confidence

---

## 📞 Support

For issues or questions:
- GitHub Issues: [project-repo/issues]
- Documentation: [docs.yourproject.com]
- Email: support@yourproject.com
