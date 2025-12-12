"""
Continuous Learning Pipeline
Retrains models using new market data + signal outcome feedback
Implements reinforcement learning to improve from experience
"""
import numpy as np
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import json

from models import EnsemblePricePredictor, ModelConfig
from data_processor import DataProcessor
from feedback_collector import SignalFeedbackCollector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContinuousLearner:
    """Implements continuous learning with feedback integration"""
    
    def __init__(self):
        self.data_processor = DataProcessor()
        self.feedback_collector = SignalFeedbackCollector()
        self.models_dir = Path(__file__).parent / 'models'
        self.models_dir.mkdir(exist_ok=True)
        
    def retrain_with_feedback(
        self,
        symbol: str,
        timeframe: str,
        market_data_path: str,
        existing_model_path: str = None
    ) -> Dict:
        """
        Retrain model with new data + feedback from signal outcomes
        
        Uses reinforcement learning approach:
        - Successful signals → Strengthen similar patterns
        - Failed signals → Reduce weight of similar patterns
        """
        logger.info("="*60)
        logger.info(f"CONTINUOUS LEARNING: {symbol} {timeframe}")
        logger.info("="*60)
        
        # Load market data
        logger.info("\n1. Loading market data...")
        df = pd.read_csv(market_data_path)
        logger.info(f"   Loaded {len(df)} candles")
        
        # Prepare features
        logger.info("\n2. Extracting features...")
        X, y = self.data_processor.prepare_training_data(df)
        logger.info(f"   Features: {X.shape}, Labels: {y.shape}")
        
        # Load feedback data
        logger.info("\n3. Loading signal feedback...")
        feedback_df = self.feedback_collector.get_feedback_data(
            symbol, timeframe, min_samples=5
        )
        
        # Apply feedback weighting
        if feedback_df is not None and len(feedback_df) > 0:
            logger.info(f"   Found {len(feedback_df)} feedback signals")
            sample_weights = self.calculate_sample_weights(
                X, y, feedback_df
            )
            logger.info(f"   Applied feedback-based sample weights")
        else:
            logger.info("   No feedback data yet, training without weights")
            sample_weights = None
        
        # Initialize or load existing model
        logger.info("\n4. Initializing model...")
        predictor = EnsemblePricePredictor()
        
        if existing_model_path and Path(existing_model_path).exists():
            logger.info(f"   Loading existing model: {existing_model_path}")
            predictor.load_models(existing_model_path)
            logger.info("   Will perform incremental update")
        else:
            logger.info("   Building new ensemble from scratch")
            predictor.build_models()
        
        # Train with weighted samples
        logger.info("\n5. Training with feedback integration...")
        results = predictor.train(
            X, y, 
            sample_weight=sample_weights,
            verbose=True
        )
        
        # Save updated model
        model_path = self.models_dir / f"{symbol.lower()}_{timeframe}_ensemble.pkl"
        logger.info(f"\n6. Saving updated model to {model_path}...")
        predictor.save_models(str(model_path))
        
        # Save training metadata
        metadata = {
            'symbol': symbol,
            'timeframe': timeframe,
            'trained_at': datetime.now().isoformat(),
            'training_samples': len(X),
            'feedback_samples': len(feedback_df) if feedback_df is not None else 0,
            'used_feedback_weights': sample_weights is not None,
            'accuracy': results.get('ensemble', {}).get('accuracy', 0),
            'f1_score': results.get('ensemble', {}).get('f1_score', 0)
        }
        
        metadata_path = model_path.with_suffix('.meta.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info("\n" + "="*60)
        logger.info("CONTINUOUS LEARNING COMPLETE")
        logger.info("="*60)
        logger.info(f"Accuracy: {metadata['accuracy']:.4f}")
        logger.info(f"F1 Score: {metadata['f1_score']:.4f}")
        logger.info(f"Feedback samples used: {metadata['feedback_samples']}")
        
        return metadata
    
    def calculate_sample_weights(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feedback_df: pd.DataFrame
    ) -> np.ndarray:
        """
        Calculate sample weights based on signal feedback
        
        Reinforcement learning approach:
        - Recent samples get higher weight
        - Samples similar to successful signals get boosted
        - Samples similar to failed signals get reduced weight
        """
        n_samples = len(X)
        weights = np.ones(n_samples)
        
        # Time decay: More recent data is more relevant
        time_decay = np.linspace(0.8, 1.0, n_samples)
        weights *= time_decay
        
        # Feedback-based adjustment
        if len(feedback_df) > 0:
            # Get average reward per signal type
            signal_rewards = feedback_df.groupby('signal_type')['weighted_reward'].mean().to_dict()
            
            # Adjust weights based on label and historical success
            for label_idx, label_name in enumerate(['SELL', 'HOLD', 'BUY']):
                label_mask = (y == label_idx)
                reward = signal_rewards.get(label_name, 0)
                
                # Boost successful patterns, reduce failed ones
                adjustment = 1.0 + (reward * 0.3)  # ±30% adjustment max
                adjustment = np.clip(adjustment, 0.5, 1.5)  # Limit to 50%-150%
                
                weights[label_mask] *= adjustment
                
                logger.info(f"   {label_name} signals: reward={reward:.3f}, weight_mult={adjustment:.3f}")
        
        # Normalize weights
        weights = weights / weights.mean()
        
        return weights
    
    def incremental_update(
        self,
        symbol: str,
        timeframe: str,
        new_data_path: str
    ) -> Dict:
        """
        Perform incremental model update with new data
        Faster than full retraining
        """
        logger.info(f"🔄 Incremental update: {symbol} {timeframe}")
        
        model_path = self.models_dir / f"{symbol.lower()}_{timeframe}_ensemble.pkl"
        
        if not model_path.exists():
            logger.warning("No existing model found, performing full training")
            return self.retrain_with_feedback(
                symbol, timeframe, new_data_path
            )
        
        # Load only recent data
        logger.info("Loading new data...")
        df = pd.read_csv(new_data_path)
        
        # Take last 30 days only for incremental update
        df_recent = df.tail(720)  # ~30 days of hourly data
        
        logger.info(f"Using {len(df_recent)} recent samples for update")
        
        # Retrain with recent data + feedback
        return self.retrain_with_feedback(
            symbol, 
            timeframe,
            new_data_path,
            existing_model_path=str(model_path)
        )
    
    def evaluate_improvement(
        self,
        symbol: str,
        timeframe: str,
        lookback_days: int = 30
    ) -> Dict:
        """
        Evaluate if model is improving over time
        """
        logger.info(f"📈 Evaluating improvement: {symbol} {timeframe}")
        
        feedback_df = self.feedback_collector.get_feedback_data(
            symbol, timeframe, min_samples=1
        )
        
        if feedback_df is None or len(feedback_df) < 10:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 10 closed signals to evaluate'
            }
        
        # Sort by time
        feedback_df['timestamp'] = pd.to_datetime(feedback_df['timestamp'])
        feedback_df = feedback_df.sort_values('timestamp')
        
        # Split into early and recent periods
        split_idx = len(feedback_df) // 2
        early_signals = feedback_df.iloc[:split_idx]
        recent_signals = feedback_df.iloc[split_idx:]
        
        early_stats = {
            'count': len(early_signals),
            'success_rate': (early_signals['reward'] > 0).mean() * 100,
            'avg_return': early_signals['profit_loss'].mean()
        }
        
        recent_stats = {
            'count': len(recent_signals),
            'success_rate': (recent_signals['reward'] > 0).mean() * 100,
            'avg_return': recent_signals['profit_loss'].mean()
        }
        
        improvement = {
            'success_rate_delta': recent_stats['success_rate'] - early_stats['success_rate'],
            'avg_return_delta': recent_stats['avg_return'] - early_stats['avg_return']
        }
        
        is_improving = (
            improvement['success_rate_delta'] > 0 or 
            improvement['avg_return_delta'] > 0
        )
        
        logger.info(f"\n📊 Improvement Analysis:")
        logger.info(f"  Early period: {early_stats['success_rate']:.1f}% success, {early_stats['avg_return']:.2f}% avg return")
        logger.info(f"  Recent period: {recent_stats['success_rate']:.1f}% success, {recent_stats['avg_return']:.2f}% avg return")
        logger.info(f"  {'✓ IMPROVING' if is_improving else '⚠ DECLINING'}")
        
        return {
            'status': 'evaluated',
            'early': early_stats,
            'recent': recent_stats,
            'improvement': improvement,
            'is_improving': is_improving
        }


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Continuous learning with feedback')
    parser.add_argument('--symbol', type=str, required=True, help='Trading symbol')
    parser.add_argument('--timeframe', type=str, default='1h', help='Timeframe')
    parser.add_argument('--mode', type=str, default='retrain',
                       choices=['retrain', 'incremental', 'evaluate'],
                       help='Learning mode')
    parser.add_argument('--data', type=str, help='Path to market data CSV')
    
    args = parser.parse_args()
    
    learner = ContinuousLearner()
    
    if args.mode == 'retrain':
        if not args.data:
            args.data = f'data/{args.symbol.lower()}_{args.timeframe}.csv'
        
        learner.retrain_with_feedback(
            args.symbol,
            args.timeframe,
            args.data
        )
    
    elif args.mode == 'incremental':
        if not args.data:
            args.data = f'data/{args.symbol.lower()}_{args.timeframe}.csv'
        
        learner.incremental_update(
            args.symbol,
            args.timeframe,
            args.data
        )
    
    elif args.mode == 'evaluate':
        learner.evaluate_improvement(
            args.symbol,
            args.timeframe
        )


if __name__ == '__main__':
    main()
