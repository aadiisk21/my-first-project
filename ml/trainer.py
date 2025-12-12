"""
Model training pipeline for Ensemble ML price prediction
Supports Random Forest, XGBoost, and LightGBM
"""

import numpy as np
import pandas as pd
from models import EnsemblePricePredictor, ModelConfig
from data_processor import DataProcessor
import logging
import sys
import argparse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelTrainer:
    """Handles model training and evaluation"""
    
    def __init__(self, config: ModelConfig = None):
        self.config = config or ModelConfig()
        self.predictor = EnsemblePricePredictor(self.config)
        self.data_processor = DataProcessor()
    
    def train(self, market_data_path: str, save_path: str = 'models/ensemble_predictor.pkl'):
        """
        Train the ensemble models on historical data
        
        Args:
            market_data_path: Path to CSV file with historical OHLCV data
            save_path: Where to save the trained model
        """
        logger.info("=" * 60)
        logger.info("ENSEMBLE MODEL TRAINING PIPELINE")
        logger.info("=" * 60)
        
        logger.info("\n1. Loading market data...")
        df = pd.read_csv(market_data_path)
        logger.info(f"   Loaded {len(df)} rows")
        
        logger.info("\n2. Preprocessing data and extracting features...")
        X, y = self.data_processor.prepare_training_data(df)
        if X.ndim == 3:
            # Flatten sequence dimension for classical ML models
            X = X.reshape(X.shape[0], -1)
        logger.info(f"   Features shape: {X.shape}")
        logger.info(f"   Labels shape: {y.shape}")
        logger.info(f"   Class distribution: SELL={np.sum(y==0)}, HOLD={np.sum(y==1)}, BUY={np.sum(y==2)}")
        
        logger.info("\n3. Building ensemble models...")
        self.predictor.build_models()
        
        logger.info("\n4. Training models...")
        results = self.predictor.train(X, y, verbose=True)
        
        logger.info("\n5. Training Results:")
        logger.info("-" * 60)
        for model_name, metrics in results.items():
            logger.info(f"\n{model_name.upper()}:")
            logger.info(f"  Accuracy: {metrics['accuracy']:.4f}")
            logger.info(f"  F1 Score: {metrics['f1_score']:.4f}")
        
        logger.info(f"\n6. Saving models to {save_path}...")
        self.predictor.save_models(save_path)
        
        logger.info("\n" + "=" * 60)
        logger.info("TRAINING COMPLETE!")
        logger.info("=" * 60)
        
        return results
    
    def evaluate(self, test_data_path: str, model_path: str = 'models/ensemble_predictor.pkl'):
        """Evaluate model on test data"""
        logger.info("=" * 60)
        logger.info("MODEL EVALUATION")
        logger.info("=" * 60)
        
        logger.info("\n1. Loading test data...")
        df = pd.read_csv(test_data_path)
        logger.info(f"   Loaded {len(df)} rows")
        
        logger.info("\n2. Preprocessing...")
        X_test, y_test = self.data_processor.prepare_training_data(df)
        if X_test.ndim == 3:
            X_test = X_test.reshape(X_test.shape[0], -1)
        
        logger.info("\n3. Loading trained model...")
        self.predictor.load_models(model_path)
        
        logger.info("\n4. Evaluating models...")
        results = self.predictor.evaluate(X_test, y_test)
        
        logger.info("\n5. Evaluation Results:")
        logger.info("-" * 60)
        for model_name, metrics in results.items():
            logger.info(f"\n{model_name.upper()}:")
            logger.info(f"  Accuracy: {metrics['accuracy']:.4f}")
            logger.info(f"  F1 Score: {metrics['f1_score']:.4f}")
            logger.info(f"\n  Classification Report:")
            logger.info(metrics['classification_report'])
        
        logger.info("\n" + "=" * 60)
        logger.info("EVALUATION COMPLETE!")
        logger.info("=" * 60)
        
        return results
    
    def quick_test(self, n_samples: int = 5000):
        """Quick test with synthetic data"""
        logger.info("=" * 60)
        logger.info("QUICK TEST WITH SYNTHETIC DATA")
        logger.info("=" * 60)
        
        logger.info(f"\n1. Generating {n_samples} synthetic samples...")
        np.random.seed(42)
        n_features = 50
        
        # Generate features
        X = np.random.randn(n_samples, n_features)
        
        # Generate labels with some structure
        # BUY when features are positive
        # SELL when features are negative
        # HOLD otherwise
        feature_sum = X.mean(axis=1)
        y = np.zeros(n_samples, dtype=int) + 1  # Start with HOLD
        y[feature_sum > 0.3] = 2  # BUY
        y[feature_sum < -0.3] = 0  # SELL
        
        logger.info(f"   Class distribution: SELL={np.sum(y==0)}, HOLD={np.sum(y==1)}, BUY={np.sum(y==2)}")
        
        logger.info("\n2. Training ensemble models...")
        self.predictor.build_models()
        results = self.predictor.train(X, y, verbose=True)
        
        logger.info("\n3. Testing prediction...")
        test_sample = np.random.randn(1, n_features)
        pred, proba = self.predictor.predict(test_sample, return_proba=True)
        
        logger.info(f"\n   Test Prediction:")
        logger.info(f"   Signal: {self.predictor.class_names[pred[0]]}")
        logger.info(f"   Confidence: {proba[0][pred[0]] * 100:.2f}%")
        logger.info(f"   Probabilities: SELL={proba[0][0]*100:.2f}%, HOLD={proba[0][1]*100:.2f}%, BUY={proba[0][2]*100:.2f}%")
        
        logger.info("\n4. Saving model...")
        self.predictor.save_models('models/test_ensemble.pkl')
        
        logger.info("\n5. Testing load...")
        predictor2 = EnsemblePricePredictor()
        predictor2.load_models('models/test_ensemble.pkl')
        pred2, proba2 = predictor2.predict(test_sample, return_proba=True)
        
        logger.info(f"   Loaded model prediction matches: {np.array_equal(pred, pred2)}")
        
        logger.info("\n" + "=" * 60)
        logger.info("QUICK TEST COMPLETE!")
        logger.info("=" * 60)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train ensemble ML models for price prediction')
    parser.add_argument('--mode', type=str, default='test', choices=['train', 'evaluate', 'test'],
                       help='Mode: train, evaluate, or test')
    parser.add_argument('--data', type=str, default=None,
                       help='Path to data CSV file (defaults to data/{symbol}_{timeframe}.csv)')
    parser.add_argument('--train-data', type=str, default=None,
                       help='Path to training data CSV (alternative to --data)')
    parser.add_argument('--test-data', type=str, default=None,
                       help='Path to test data CSV (defaults to data/{symbol}_{timeframe}_test.csv)')
    parser.add_argument('--model-path', type=str, default='models/ensemble_predictor.pkl',
                       help='Path to save/load model')
    parser.add_argument('--symbol', type=str, default='BTCUSDT',
                       help='Trading symbol (e.g., BTCUSDT)')
    parser.add_argument('--timeframe', type=str, default='1h',
                       help='Timeframe (e.g., 1h, 4h, 1d)')
    
    args = parser.parse_args()
    
    trainer = ModelTrainer()
    
    # Determine paths
    default_train = f'data/{args.symbol.lower()}_{args.timeframe}.csv'
    train_data = args.train_data or args.data or default_train
    default_test = f'data/{args.symbol.lower()}_{args.timeframe}_test.csv'
    test_data = args.test_data or default_test
    
    if args.mode == 'test':
        # Quick test with synthetic data
        trainer.quick_test(n_samples=5000)
    elif args.mode == 'train':
        # Train on real data
        import os
        if not os.path.exists(train_data):
            logger.error(f"Data file not found: {train_data}")
            logger.error(f"Please run: python fetch_market_data.py {args.symbol} --interval {args.timeframe}")
            sys.exit(1)
        
        # Auto-generate model path based on symbol and timeframe
        if args.model_path == 'models/ensemble_predictor.pkl':
            args.model_path = f'models/{args.symbol.lower()}_{args.timeframe}_ensemble.pkl'
        
        logger.info(f"Training with data: {train_data}")
        logger.info(f"Will save model to: {args.model_path}")
        
        trainer.train(
            market_data_path=train_data,
            save_path=args.model_path
        )
    elif args.mode == 'evaluate':
        # Evaluate on test data
        trainer.evaluate(
            test_data_path=test_data,
            model_path=args.model_path
        )
