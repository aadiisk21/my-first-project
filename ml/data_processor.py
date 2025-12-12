import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MarketDataPoint:
    """Single market data point"""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    symbol: str

@dataclass
class TechnicalIndicators:
    """Technical indicators for market data"""
    rsi: float
    macd: float
    macd_signal: float
    macd_histogram: float
    bollinger_upper: float
    bollinger_middle: float
    bollinger_lower: float
    sma_20: float
    ema_20: float
    stochastic_k: float
    stochastic_d: float
    atr: float

class DataProcessor:
    """Advanced data processing pipeline for trading signals"""

    def __init__(self):
        self.scalers = {}
        self.feature_columns = []

    def prepare_training_data(
        self,
        df: pd.DataFrame,
        sequence_length: int = 60,
        prediction_horizon: int = 1,
        normalize: bool = True,
        augment: bool = False
    ) -> Tuple[np.ndarray, np.ndarray]:
        """End-to-end feature pipeline used by trainer/auto_trainer."""
        try:
            # Ensure timestamp parsed for time features
            if 'timestamp' in df.columns:
                df = df.copy()
                df['timestamp'] = pd.to_datetime(df['timestamp'])

            # 1) indicators
            df_features = self.calculate_technical_indicators(df)

            # 2) sequences + labels
            X, y = self.create_sequences(
                df_features,
                sequence_length=sequence_length,
                prediction_horizon=prediction_horizon
            )

            # 3) normalization
            if normalize:
                X = self.normalize_features(X, fit=True)

            # 4) optional augmentation
            if augment:
                X, y = self.add_noise_augmentation(X, y)

            return X, y

        except Exception as e:
            logger.error(f"Error preparing training data: {e}")
            raise

    def load_market_data(self, data: List[Dict]) -> pd.DataFrame:
        """Convert raw market data to DataFrame"""
        try:
            df = pd.DataFrame(data)

            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp').reset_index(drop=True)

            # Validate required columns
            required_cols = ['open', 'high', 'low', 'close', 'volume']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")

            logger.info(f"Loaded {len(df)} market data points")
            return df

        except Exception as e:
            logger.error(f"Error loading market data: {str(e)}")
            raise

    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate comprehensive technical indicators"""
        try:
            df_indicators = df.copy()

            # Price-based indicators
            df_indicators = self._calculate_price_indicators(df_indicators)

            # Momentum indicators
            df_indicators = self._calculate_momentum_indicators(df_indicators)

            # Volatility indicators
            df_indicators = self._calculate_volatility_indicators(df_indicators)

            # Volume indicators
            df_indicators = self._calculate_volume_indicators(df_indicators)

            # Pattern indicators
            df_indicators = self._calculate_pattern_indicators(df_indicators)

            # Time-based features
            df_indicators = self._calculate_time_features(df_indicators)

            logger.info(f"Calculated {len(df_indicators.columns) - len(df.columns)} technical indicators")
            return df_indicators

        except Exception as e:
            logger.error(f"Error calculating technical indicators: {str(e)}")
            raise

    def _calculate_price_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate price-based indicators"""
        # Simple Moving Averages
        for period in [5, 10, 20, 50, 100, 200]:
            df[f'sma_{period}'] = df['close'].rolling(window=period).mean()
            df[f'sma_{period}_ratio'] = df['close'] / df[f'sma_{period}']

        # Exponential Moving Averages
        for period in [12, 26, 50, 200]:
            df[f'ema_{period}'] = df['close'].ewm(span=period).mean()
            df[f'ema_{period}_ratio'] = df['close'] / df[f'ema_{period}']

        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])

        # Price changes
        df['price_change'] = df['close'].pct_change()
        df['price_change_2'] = df['close'].pct_change(2)
        df['price_change_5'] = df['close'].pct_change(5)

        # High-Low spread
        df['hl_spread'] = (df['high'] - df['low']) / df['close']
        df['oc_spread'] = (df['close'] - df['open']) / df['open']

        return df

    def _calculate_momentum_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate momentum indicators"""
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # MACD
        ema_12 = df['close'].ewm(span=12).mean()
        ema_26 = df['close'].ewm(span=26).mean()
        df['macd'] = ema_12 - ema_26
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']

        # Stochastic Oscillator
        low_14 = df['low'].rolling(window=14).min()
        high_14 = df['high'].rolling(window=14).max()
        df['stoch_k'] = 100 * ((df['close'] - low_14) / (high_14 - low_14))
        df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()

        # Williams %R
        df['williams_r'] = -100 * ((high_14 - df['close']) / (high_14 - low_14))

        # Rate of Change (ROC)
        df['roc'] = ((df['close'] - df['close'].shift(12)) / df['close'].shift(12)) * 100

        # Commodity Channel Index (CCI)
        tp = (df['high'] + df['low'] + df['close']) / 3
        sma_tp = tp.rolling(window=20).mean()
        mad = tp.rolling(window=20).apply(lambda x: np.abs(x - x.mean()).mean())
        df['cci'] = (tp - sma_tp) / (0.015 * mad)

        return df

    def _calculate_volatility_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate volatility indicators"""
        # Average True Range (ATR)
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        true_range = np.maximum(high_low, np.maximum(high_close, low_close))
        df['atr'] = true_range.rolling(window=14).mean()

        # Historical Volatility
        df['log_returns'] = np.log(df['close'] / df['close'].shift())
        df['volatility_20'] = df['log_returns'].rolling(window=20).std() * np.sqrt(252)

        # Price Volatility
        df['price_volatility'] = df['close'].rolling(window=20).std() / df['close'].rolling(window=20).mean()

        return df

    def _calculate_volume_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate volume-based indicators"""
        # Volume Moving Averages
        df['volume_sma_20'] = df['volume'].rolling(window=20).mean()
        df['volume_sma_50'] = df['volume'].rolling(window=50).mean()

        # Volume ratios
        df['volume_ratio'] = df['volume'] / df['volume_sma_20']

        # On-Balance Volume (OBV)
        obv = np.where(df['close'] > df['close'].shift(), df['volume'],
                      np.where(df['close'] < df['close'].shift(), -df['volume'], 0))
        df['obv'] = np.cumsum(obv)
        df['obv_sma'] = df['obv'].rolling(window=20).mean()

        # Volume Price Trend (VPT)
        df['vpt'] = df['volume'] * df['price_change']
        df['vpt_cumulative'] = np.cumsum(df['vpt'])

        return df

    def _calculate_pattern_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate pattern-based indicators"""
        # Support and Resistance levels
        df['resistance_20'] = df['high'].rolling(window=20).max()
        df['support_20'] = df['low'].rolling(window=20).min()

        # Distance from support/resistance
        df['resistance_distance'] = (df['resistance_20'] - df['close']) / df['close']
        df['support_distance'] = (df['close'] - df['support_20']) / df['close']

        # Candlestick patterns (simplified)
        df['is_doji'] = np.abs(df['close'] - df['open']) < (0.01 * df['close'])
        # Use element-wise ops; guard against zero range to avoid division warnings
        range_hl = df['high'] - df['low']
        body_ratio = (df['close'] - df['low']) / range_hl.replace(0, np.nan)
        df['is_hammer'] = ((range_hl > 2 * np.abs(df['close'] - df['open'])) & (body_ratio > 0.6)).fillna(False)

        # Gap detection
        df['gap_up'] = df['low'] > df['high'].shift()
        df['gap_down'] = df['high'] < df['low'].shift()

        return df

    def _calculate_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate time-based features"""
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['day_of_month'] = df['timestamp'].dt.day
        df['month'] = df['timestamp'].dt.month
        df['quarter'] = df['timestamp'].dt.quarter

        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

        return df

    def create_sequences(self,
                        df: pd.DataFrame,
                        sequence_length: int = 60,
                        prediction_horizon: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for ML model training"""
        try:
            # Select feature columns (exclude non-feature columns)
            exclude_cols = ['timestamp', 'symbol']
            feature_cols = [col for col in df.columns if col not in exclude_cols]

            # Remove rows with NaN values
            df_clean = df[feature_cols].dropna()

            if len(df_clean) < sequence_length + prediction_horizon:
                raise ValueError(f"Not enough data for sequence creation. Need at least {sequence_length + prediction_horizon} rows")

            # Create sequences
            X, y = [], []

            for i in range(len(df_clean) - sequence_length - prediction_horizon + 1):
                # Input sequence
                X.append(df_clean.iloc[i:i+sequence_length].values)

                # Target: price movement prediction
                current_price = df_clean.iloc[i+sequence_length-1]['close'] if 'close' in df_clean.columns else 0
                future_price = df_clean.iloc[i+sequence_length+prediction_horizon-1]['close'] if 'close' in df_clean.columns else 0

                if current_price > 0:
                    price_change_pct = (future_price - current_price) / current_price
                    # Convert to classification: -1 (sell), 0 (hold), 1 (buy)
                    if price_change_pct < -0.01:  # Less than -1%
                        y.append(0)  # Sell
                    elif price_change_pct > 0.01:  # Greater than 1%
                        y.append(2)  # Buy
                    else:
                        y.append(1)  # Hold
                else:
                    y.append(1)  # Default to hold

            X = np.array(X)
            y = np.array(y)

            self.feature_columns = feature_cols

            logger.info(f"Created {len(X)} sequences with {X.shape[2]} features each")
            return X, y

        except Exception as e:
            logger.error(f"Error creating sequences: {str(e)}")
            raise

    def normalize_features(self, X: np.ndarray, fit: bool = True) -> np.ndarray:
        """Normalize features using MinMax scaling"""
        try:
            from sklearn.preprocessing import MinMaxScaler

            if fit or not self.scalers:
                self.scalers = {}
                # Scale each feature separately
                for i in range(X.shape[2]):
                    scaler = MinMaxScaler()
                    X[:, :, i] = scaler.fit_transform(X[:, :, i])
                    self.scalers[i] = scaler
            else:
                # Use existing scalers
                for i in range(X.shape[2]):
                    if i in self.scalers:
                        X[:, :, i] = self.scalers[i].transform(X[:, :, i])

            return X

        except Exception as e:
            logger.error(f"Error normalizing features: {str(e)}")
            raise

    def add_noise_augmentation(self,
                            X: np.ndarray,
                            y: np.ndarray,
                            noise_factor: float = 0.01) -> Tuple[np.ndarray, np.ndarray]:
        """Add noise augmentation to training data"""
        try:
            # Add random noise to features
            noise = np.random.normal(0, noise_factor, X.shape)
            X_noisy = X + noise

            # Ensure values remain reasonable
            X_noisy = np.clip(X_noisy, 0, 1)

            # Concatenate original and noisy data
            X_augmented = np.concatenate([X, X_noisy], axis=0)
            y_augmented = np.concatenate([y, y], axis=0)

            logger.info(f"Augmented data: {len(X)} -> {len(X_augmented)} sequences")
            return X_augmented, y_augmented

        except Exception as e:
            logger.error(f"Error adding noise augmentation: {str(e)}")
            raise

    def get_feature_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate feature importance based on correlation with target"""
        try:
            if 'close' not in df.columns:
                return {}

            # Calculate correlation with future price changes
            df['future_return'] = df['close'].shift(-1) / df['close'] - 1

            feature_cols = [col for col in df.columns
                          if col not in ['timestamp', 'symbol', 'future_return']]

            correlations = {}
            for col in feature_cols:
                if df[col].dtype in ['float64', 'int64']:
                    corr = abs(df[col].corr(df['future_return']))
                    if not np.isnan(corr):
                        correlations[col] = corr

            # Sort by importance
            sorted_features = sorted(correlations.items(), key=lambda x: x[1], reverse=True)

            return dict(sorted_features)

        except Exception as e:
            logger.error(f"Error calculating feature importance: {str(e)}")
            return {}

    def get_processed_data_summary(self, df: pd.DataFrame) -> Dict:
        """Get summary of processed data"""
        try:
            summary = {
                'total_records': len(df),
                'total_features': len(df.columns),
                'date_range': {
                    'start': df['timestamp'].min() if 'timestamp' in df.columns else None,
                    'end': df['timestamp'].max() if 'timestamp' in df.columns else None
                },
                'missing_values': df.isnull().sum().to_dict(),
                'data_types': df.dtypes.to_dict(),
                'numeric_features': len(df.select_dtypes(include=[np.number]).columns),
                'categorical_features': len(df.select_dtypes(include=['object', 'category']).columns)
            }

            # Add basic statistics for numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                summary['statistics'] = df[numeric_cols].describe().to_dict()

            return summary

        except Exception as e:
            logger.error(f"Error generating data summary: {str(e)}")
            return {}

# Usage example
if __name__ == "__main__":
    # Example usage of DataProcessor
    processor = DataProcessor()

    # Mock data for testing
    dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='H')
    mock_data = []

    base_price = 45000
    for i, date in enumerate(dates):
        price = base_price * (1 + np.sin(i/100) * 0.1 + np.random.normal(0, 0.02))
        mock_data.append({
            'timestamp': date,
            'open': price,
            'high': price * (1 + abs(np.random.normal(0, 0.01))),
            'low': price * (1 - abs(np.random.normal(0, 0.01))),
            'close': price * (1 + np.random.normal(0, 0.005)),
            'volume': np.random.uniform(1000000, 5000000)
        })

    # Process data
    df = processor.load_market_data(mock_data)
    df_with_indicators = processor.calculate_technical_indicators(df)
    X, y = processor.create_sequences(df_with_indicators)
    X_normalized = processor.normalize_features(X)

    print(f"Processed {len(df)} data points into {len(X)} sequences")
    print(f"Features: {len(processor.feature_columns)}")
    print(f"Class distribution: {np.bincount(y)}")