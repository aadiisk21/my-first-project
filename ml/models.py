"""
Advanced Price Prediction Models using Ensemble Machine Learning
Supports Random Forest, XGBoost, and LightGBM for cryptocurrency trading
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, List, Optional, Union
from dataclasses import dataclass
import logging
import joblib
import os
from datetime import datetime

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb
import warnings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress noisy warnings about feature name mismatches from sklearn wrappers
warnings.filterwarnings(
    "ignore",
    message=".*does not have valid feature names, but.*was fitted with feature names.*",
    category=UserWarning
)

@dataclass
class ModelConfig:
    """Configuration for ML models"""
    sequence_length: int = 60
    n_features: int = 50
    prediction_horizon: int = 1
    test_size: float = 0.2
    random_state: int = 42
    
    # Random Forest params
    rf_n_estimators: int = 200
    rf_max_depth: int = 15
    rf_min_samples_split: int = 5
    
    # XGBoost params
    xgb_n_estimators: int = 300
    xgb_max_depth: int = 8
    xgb_learning_rate: float = 0.1
    
    # LightGBM params
    lgb_n_estimators: int = 300
    lgb_max_depth: int = 8
    lgb_learning_rate: float = 0.1

class EnsemblePricePredictor:
    """
    Ensemble model for cryptocurrency price prediction
    Combines Random Forest, XGBoost, and LightGBM for accurate signals
    """

    def __init__(self, config: ModelConfig = None):
        self.config = config or ModelConfig()
        self.models = {}
        self.scaler = StandardScaler()
        self.feature_importance = None
        self.class_names = ['SELL', 'HOLD', 'BUY']
        self.is_trained = False
        self.training_history = {}

    def build_models(self) -> Dict:
        """Build ensemble of ML models"""
        try:
            logger.info("Building ensemble models...")
            
            # Random Forest
            self.models['rf'] = RandomForestClassifier(
                n_estimators=self.config.rf_n_estimators,
                max_depth=self.config.rf_max_depth,
                min_samples_split=self.config.rf_min_samples_split,
                random_state=self.config.random_state,
                n_jobs=-1,
                class_weight='balanced'
            )
            
            # XGBoost
            self.models['xgb'] = xgb.XGBClassifier(
                n_estimators=self.config.xgb_n_estimators,
                max_depth=self.config.xgb_max_depth,
                learning_rate=self.config.xgb_learning_rate,
                random_state=self.config.random_state,
                n_jobs=-1,
                objective='multi:softprob',
                num_class=3,
                eval_metric='mlogloss',
                verbosity=0
            )
            
            # LightGBM
            self.models['lgb'] = lgb.LGBMClassifier(
                n_estimators=self.config.lgb_n_estimators,
                max_depth=self.config.lgb_max_depth,
                learning_rate=self.config.lgb_learning_rate,
                random_state=self.config.random_state,
                n_jobs=-1,
                objective='multiclass',
                num_class=3,
                class_weight='balanced',
                verbosity=-1
            )
            
            logger.info(f"Built {len(self.models)} models: {list(self.models.keys())}")
            return self.models

        except Exception as e:
            logger.error(f"Error building models: {str(e)}")
            raise

    def train(self, X: np.ndarray, y: np.ndarray, verbose: bool = True) -> Dict:
        """
        Train all ensemble models
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Target labels (n_samples,)
            verbose: Print training progress
            
        Returns:
            Dictionary with training metrics
        """
        try:
            logger.info(f"Training on {X.shape[0]} samples with {X.shape[1]} features")
            
            # Split data
            X_train, X_val, y_train, y_val = train_test_split(
                X, y,
                test_size=self.config.test_size,
                random_state=self.config.random_state,
                stratify=y
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_val_scaled = self.scaler.transform(X_val)
            
            # Build models if not already built
            if not self.models:
                self.build_models()
            
            # Train each model
            results = {}
            for name, model in self.models.items():
                logger.info(f"Training {name.upper()} model...")
                
                # Train
                model.fit(X_train_scaled, y_train)
                
                # Validate
                y_pred = model.predict(X_val_scaled)
                accuracy = accuracy_score(y_val, y_pred)
                f1 = f1_score(y_val, y_pred, average='weighted', zero_division=0)
                
                results[name] = {
                    'accuracy': accuracy,
                    'f1_score': f1,
                    'classification_report': classification_report(y_val, y_pred, target_names=self.class_names, zero_division=0)
                }
                
                if verbose:
                    logger.info(f"{name.upper()} - Accuracy: {accuracy:.4f}, F1: {f1:.4f}")
            
            # Calculate ensemble predictions
            ensemble_pred = self._ensemble_predict(X_val_scaled)
            ensemble_accuracy = accuracy_score(y_val, ensemble_pred)
            ensemble_f1 = f1_score(y_val, ensemble_pred, average='weighted', zero_division=0)
            
            results['ensemble'] = {
                'accuracy': ensemble_accuracy,
                'f1_score': ensemble_f1,
                'classification_report': classification_report(y_val, ensemble_pred, target_names=self.class_names, zero_division=0)
            }
            
            logger.info(f"ENSEMBLE - Accuracy: {ensemble_accuracy:.4f}, F1: {ensemble_f1:.4f}")
            
            self.is_trained = True
            self.training_history = results
            
            # Calculate feature importance
            self._calculate_feature_importance()
            
            return results

        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise

    def _ensemble_predict(self, X: np.ndarray) -> np.ndarray:
        """Make ensemble prediction by voting"""
        predictions = []
        for model in self.models.values():
            pred = model.predict(X)
            predictions.append(pred)
        
        # Majority voting
        predictions = np.array(predictions)
        ensemble_pred = np.apply_along_axis(
            lambda x: np.bincount(x).argmax(),
            axis=0,
            arr=predictions
        )
        return ensemble_pred

    def _ensemble_predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get ensemble prediction probabilities"""
        probas = []
        for model in self.models.values():
            proba = model.predict_proba(X)
            probas.append(proba)
        
        # Average probabilities
        ensemble_proba = np.mean(probas, axis=0)
        return ensemble_proba

    def predict(self, X: np.ndarray, return_proba: bool = True) -> Union[np.ndarray, Tuple[np.ndarray, np.ndarray]]:
        """
        Make predictions on new data
        
        Args:
            X: Feature matrix
            return_proba: Return probability scores
            
        Returns:
            Predictions and optionally probabilities
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Get ensemble predictions
        predictions = self._ensemble_predict(X_scaled)
        
        if return_proba:
            probabilities = self._ensemble_predict_proba(X_scaled)
            return predictions, probabilities
        
        return predictions

    def predict_single(self, features: Dict[str, float]) -> Dict:
        """
        Predict signal for single data point
        
        Args:
            features: Dictionary of feature values
            
        Returns:
            Dictionary with prediction and confidence
        """
        # Convert features to array
        feature_array = np.array([list(features.values())])
        
        # Get prediction
        pred, proba = self.predict(feature_array, return_proba=True)
        
        signal_type = self.class_names[pred[0]]
        confidence = float(proba[0][pred[0]] * 100)
        
        return {
            'signal': signal_type,
            'confidence': confidence,
            'probabilities': {
                'SELL': float(proba[0][0] * 100),
                'HOLD': float(proba[0][1] * 100),
                'BUY': float(proba[0][2] * 100)
            }
        }

    def _calculate_feature_importance(self):
        """Calculate and store feature importance"""
        try:
            # Get feature importance from Random Forest
            if 'rf' in self.models:
                self.feature_importance = self.models['rf'].feature_importances_
                logger.info("Feature importance calculated")
        except Exception as e:
            logger.warning(f"Could not calculate feature importance: {str(e)}")

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """
        Evaluate models on test data
        
        Args:
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary with evaluation metrics
        """
        X_test_scaled = self.scaler.transform(X_test)
        
        results = {}
        for name, model in self.models.items():
            y_pred = model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            results[name] = {
                'accuracy': accuracy,
                'f1_score': f1,
                'classification_report': classification_report(y_test, y_pred, target_names=self.class_names),
                'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
            }
        
        # Ensemble evaluation
        ensemble_pred = self._ensemble_predict(X_test_scaled)
        results['ensemble'] = {
            'accuracy': accuracy_score(y_test, ensemble_pred),
            'f1_score': f1_score(y_test, ensemble_pred, average='weighted'),
            'classification_report': classification_report(y_test, ensemble_pred, target_names=self.class_names),
            'confusion_matrix': confusion_matrix(y_test, ensemble_pred).tolist()
        }
        
        return results

    def save_models(self, path: str = 'models/ensemble_predictor.pkl'):
        """Save trained models to disk"""
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            save_data = {
                'models': self.models,
                'scaler': self.scaler,
                'config': self.config,
                'feature_importance': self.feature_importance,
                'training_history': self.training_history,
                'class_names': self.class_names,
                'is_trained': self.is_trained
            }
            
            joblib.dump(save_data, path)
            logger.info(f"Models saved to {path}")
        except Exception as e:
            logger.error(f"Error saving models: {str(e)}")
            raise

    def load_models(self, path: str = 'models/ensemble_predictor.pkl'):
        """Load trained models from disk"""
        try:
            save_data = joblib.load(path)
            
            self.models = save_data['models']
            self.scaler = save_data['scaler']
            self.config = save_data['config']
            self.feature_importance = save_data.get('feature_importance')
            self.training_history = save_data.get('training_history', {})
            self.class_names = save_data['class_names']
            self.is_trained = save_data['is_trained']
            
            logger.info(f"Models loaded from {path}")
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise

    def get_model_info(self) -> Dict:
        """Get information about trained models"""
        return {
            'is_trained': self.is_trained,
            'models': list(self.models.keys()),
            'n_features': self.scaler.n_features_in_ if hasattr(self.scaler, 'n_features_in_') else None,
            'training_history': self.training_history,
            'class_names': self.class_names
        }


# Example usage and testing
if __name__ == '__main__':
    logger.info("Testing EnsemblePricePredictor...")
    
    # Generate sample data
    np.random.seed(42)
    n_samples = 1000
    n_features = 50
    
    X = np.random.randn(n_samples, n_features)
    y = np.random.randint(0, 3, n_samples)  # 0=SELL, 1=HOLD, 2=BUY
    
    # Create and train model
    config = ModelConfig()
    predictor = EnsemblePricePredictor(config)
    
    logger.info("Training models...")
    results = predictor.train(X, y)
    
    logger.info("\nTraining Results:")
    for model_name, metrics in results.items():
        logger.info(f"\n{model_name.upper()}:")
        logger.info(f"  Accuracy: {metrics['accuracy']:.4f}")
        logger.info(f"  F1 Score: {metrics['f1_score']:.4f}")
    
    # Test prediction
    logger.info("\nTesting prediction...")
    test_features = {f'feature_{i}': np.random.randn() for i in range(n_features)}
    prediction = predictor.predict_single(test_features)
    
    logger.info(f"\nPrediction: {prediction['signal']}")
    logger.info(f"Confidence: {prediction['confidence']:.2f}%")
    logger.info(f"Probabilities: {prediction['probabilities']}")
    
    # Save models
    logger.info("\nSaving models...")
    predictor.save_models()
    
    logger.info("\nTest completed successfully!")
