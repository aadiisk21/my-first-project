"""
AI/ML Signal Generation Service
Integrates Ensemble ML models (Random Forest, XGBoost, LightGBM) with the trading backend
"""

import sys
import json
import numpy as np
from typing import Dict, List
from models import EnsemblePricePredictor, ModelConfig
from data_processor import DataProcessor
import os

class SignalGeneratorML:
    """ML-powered signal generation using Ensemble predictions"""
    
    def __init__(self, model_path: str = None):
        self.config = ModelConfig()
        self.predictor = EnsemblePricePredictor(self.config)
        self.data_processor = DataProcessor()
        
        # Load pre-trained model if path provided
        if model_path and os.path.exists(model_path):
            self.predictor.load_models(model_path)
        elif os.path.exists('models/ensemble_predictor.pkl'):
            # Try loading default model
            self.predictor.load_models('models/ensemble_predictor.pkl')
        else:
            # No model available, will use technical indicators only
            pass
    
    def generate_signal(self, market_data: List[Dict]) -> Dict:
        """
        Generate trading signal from market data
        
        Args:
            market_data: List of OHLCV candlestick data
            
        Returns:
            Dictionary with signal type, confidence, and rationale
        """
        try:
            # Prepare data - convert list of dicts to DataFrame
            df = self.data_processor.prepare_dataframe(market_data)
            
            # Extract features for ML model
            features_df = self.data_processor.extract_features(df)
            
            # Get the latest features (most recent candle)
            if features_df.empty:
                return {
                    'success': False,
                    'error': 'No valid features could be extracted from market data'
                }
            
            latest_features = features_df.iloc[-1].values.reshape(1, -1)
            
            # Get ML prediction
            prediction_result = self.predictor.predict_single(latest_features)
            
            # Extract key indicators for rationale
            latest_row = features_df.iloc[-1]
            feature_insights = {
                'rsi': latest_row.get('rsi', 50),
                'macd_trend': 1 if latest_row.get('macd', 0) > latest_row.get('macd_signal', 0) else -1,
                'price_ma_ratio': latest_row.get('close_sma_20_ratio', 1.0)
            }
            
            return {
                'success': True,
                'signalType': prediction_result['signal'],
                'confidence': prediction_result['confidence'],
                'probabilities': prediction_result['probabilities'],
                'aiRationale': self._generate_rationale(prediction_result, feature_insights)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_rationale(self, prediction_result: Dict, features: Dict) -> str:
        """Generate human-readable AI rationale"""
        signal = prediction_result['signal']
        confidence = prediction_result['confidence']
        probs = prediction_result['probabilities']
        
        rationale = f"Ensemble AI model predicts {signal} with {confidence:.1f}% confidence. "
        rationale += f"(SELL: {probs['SELL']:.1f}%, HOLD: {probs['HOLD']:.1f}%, BUY: {probs['BUY']:.1f}%). "
        
        # Add feature-based insights
        if 'rsi' in features:
            rsi = features['rsi']
            if rsi < 30:
                rationale += "RSI indicates oversold conditions (potential reversal). "
            elif rsi > 70:
                rationale += "RSI shows overbought market (potential correction). "
            else:
                rationale += f"RSI at {rsi:.1f} (neutral zone). "
        
        if 'macd_trend' in features:
            if features['macd_trend'] > 0:
                rationale += "MACD shows bullish momentum. "
            else:
                rationale += "MACD indicates bearish trend. "
        
        if 'price_ma_ratio' in features:
            ratio = features['price_ma_ratio']
            if ratio > 1.02:
                rationale += "Price trading above moving average (bullish). "
            elif ratio < 0.98:
                rationale += "Price below moving average (bearish). "
        
        return rationale

def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No market data provided'}))
        sys.exit(1)
    
    try:
        market_data = json.loads(sys.argv[1])
        generator = SignalGeneratorML()
        result = generator.generate_signal(market_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
