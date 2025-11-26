import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
import numpy as np
import pandas as pd
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass
import logging
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """Configuration for ML models"""
    sequence_length: int = 60
    n_features: int = 50
    prediction_horizon: int = 1
    lstm_units: List[int] = (128, 64, 32)
    dropout_rate: float = 0.3
    dense_units: List[int] = (32, 16)
    learning_rate: float = 0.001
    batch_size: int = 32
    epochs: int = 100
    validation_split: float = 0.2
    early_stopping_patience: int = 10
    reduce_lr_patience: int = 5

class LSTMPricePredictor:
    """LSTM model for cryptocurrency price prediction"""

    def __init__(self, config: ModelConfig = None):
        self.config = config or ModelConfig()
        self.model = None
        self.history = None
        self.class_names = ['SELL', 'HOLD', 'BUY']
        self.callbacks_list = []

    def build_model(self, input_shape: Tuple[int, int]) -> models.Model:
        """Build the LSTM model architecture"""
        try:
            model = models.Sequential()

            # First LSTM layer with return sequences for stacking
            model.add(layers.LSTM(
                self.config.lstm_units[0],
                return_sequences=True,
                input_shape=input_shape,
                kernel_regularizer=tf.keras.regularizers.l2(0.01)
            ))
            model.add(layers.Dropout(self.config.dropout_rate))
            model.add(layers.BatchNormalization())

            # Second LSTM layer
            if len(self.config.lstm_units) > 1:
                model.add(layers.LSTM(
                    self.config.lstm_units[1],
                    return_sequences=True,
                    kernel_regularizer=tf.keras.regularizers.l2(0.01)
                ))
                model.add(layers.Dropout(self.config.dropout_rate))
                model.add(layers.BatchNormalization())

            # Third LSTM layer (no return sequences)
            if len(self.config.lstm_units) > 2:
                model.add(layers.LSTM(
                    self.config.lstm_units[2],
                    return_sequences=False,
                    kernel_regularizer=tf.keras.regularizers.l2(0.01)
                ))
                model.add(layers.Dropout(self.config.dropout_rate))
                model.add(layers.BatchNormalization())

            # Dense layers
            for units in self.config.dense_units:
                model.add(layers.Dense(
                    units,
                    activation='relu',
                    kernel_regularizer=tf.keras.regularizers.l2(0.01)
                ))
                model.add(layers.Dropout(self.config.dropout_rate))
                model.add(layers.BatchNormalization())

            # Output layer - 3 classes (SELL, HOLD, BUY)
            model.add(layers.Dense(3, activation='softmax'))

            # Compile model
            optimizer = optimizers.Adam(learning_rate=self.config.learning_rate)
            model.compile(
                optimizer=optimizer,
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy', 'sparse_categorical_crossentropy']
            )

            self.model = model
            logger.info(f"Model built with {model.count_params():,} parameters")
            return model

        except Exception as e:
            logger.error(f"Error building model: {str(e)}")
            raise

    def setup_callbacks(self, model_path: str = 'models/best_lstm_model.h5') -> None:
        """Setup training callbacks"""
        try:
            os.makedirs('models', exist_ok=True)

            # Model checkpoint
            checkpoint_callback = callbacks.ModelCheckpoint(
                filepath=model_path,
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=False,
                mode='max',
                verbose=1
            )

            # Early stopping
            early_stopping = callbacks.EarlyStopping(
                monitor='val_accuracy',
                patience=self.config.early_stopping_patience,
                restore_best_weights=True,
                mode='max',
                verbose=1
            )

            # Reduce learning rate on plateau
            reduce_lr = callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=self.config.reduce_lr_patience,
                min_lr=1e-7,
                mode='min',
                verbose=1
            )

            # CSV logger
            csv_logger = callbacks.CSVLogger(
                'models/training_log.csv',
                append=True
            )

            self.callbacks_list = [
                checkpoint_callback,
                early_stopping,
                reduce_lr,
                csv_logger
            ]

            logger.info(f"Setup {len(self.callbacks_list)} training callbacks")

        except Exception as e:
            logger.error(f"Error setting up callbacks: {str(e)}")
            raise

    def train(self,
              X: np.ndarray,
              y: np.ndarray,
              validation_split: Optional[float] = None) -> callbacks.History:
        """Train the LSTM model"""
        try:
            if self.model is None:
                raise ValueError("Model must be built before training")

            # Use provided validation_split or default
            val_split = validation_split or self.config.validation_split

            # Split data for training and validation
            if isinstance(validation_split, float) and validation_split > 0:
                X_train, X_val, y_train, y_val = train_test_split(
                    X, y, test_size=val_split, random_state=42, stratify=y
                )
                validation_data = (X_val, y_val)
                train_data = (X_train, y_train)
            else:
                validation_data = None
                train_data = (X, y)

            # Class weights for imbalanced dataset
            from sklearn.utils.class_weight import compute_class_weight
            class_weights = compute_class_weight(
                'balanced',
                classes=np.unique(y),
                y=y
            )
            class_weight_dict = dict(enumerate(class_weights))

            logger.info(f"Starting training with {len(train_data[0])} samples")
            logger.info(f"Class distribution: {np.bincount(train_data[1])}")
            logger.info(f"Class weights: {class_weight_dict}")

            # Train model
            history = self.model.fit(
                train_data[0], train_data[1],
                validation_data=validation_data,
                epochs=self.config.epochs,
                batch_size=self.config.batch_size,
                callbacks=self.callbacks_list,
                class_weight=class_weight_dict,
                verbose=1
            )

            self.history = history
            logger.info("Training completed successfully")
            return history

        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise

    def predict(self, X: np.ndarray, return_probabilities: bool = False) -> np.ndarray:
        """Make predictions on new data"""
        try:
            if self.model is None:
                raise ValueError("Model must be trained or loaded before prediction")

            predictions = self.model.predict(X, verbose=0)

            if return_probabilities:
                return predictions
            else:
                return np.argmax(predictions, axis=1)

        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            raise

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate model performance"""
        try:
            if self.model is None:
                raise ValueError("Model must be trained or loaded before evaluation")

            # Get predictions
            predictions = self.predict(X, return_probabilities=False)

            # Calculate metrics
            report = classification_report(
                y, predictions,
                target_names=self.class_names,
                output_dict=True
            )

            confusion_mat = confusion_matrix(y, predictions)

            # Calculate accuracy
            accuracy = np.mean(predictions == y)

            # Calculate confidence scores
            probabilities = self.predict(X, return_probabilities=True)
            max_probs = np.max(probabilities, axis=1)
            avg_confidence = np.mean(max_probs)

            evaluation_results = {
                'accuracy': accuracy,
                'confusion_matrix': confusion_mat.tolist(),
                'classification_report': report,
                'average_confidence': avg_confidence,
                'predictions_distribution': {
                    class_name: int(np.sum(predictions == i))
                    for i, class_name in enumerate(self.class_names)
                },
                'actual_distribution': {
                    class_name: int(np.sum(y == i))
                    for i, class_name in enumerate(self.class_names)
                }
            }

            logger.info(f"Evaluation completed. Accuracy: {accuracy:.4f}")
            return evaluation_results

        except Exception as e:
            logger.error(f"Error during evaluation: {str(e)}")
            raise

    def save_model(self, filepath: str) -> None:
        """Save the trained model"""
        try:
            if self.model is None:
                raise ValueError("No model to save")

            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            self.model.save(filepath)

            # Save configuration
            config_path = filepath.replace('.h5', '_config.json')
            with open(config_path, 'w') as f:
                json.dump(self.config.__dict__, f, indent=2)

            logger.info(f"Model saved to {filepath}")

        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise

    def load_model(self, filepath: str) -> None:
        """Load a saved model"""
        try:
            # Load configuration
            config_path = filepath.replace('.h5', '_config.json')
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config_dict = json.load(f)
                self.config = ModelConfig(**config_dict)

            # Load model
            self.model = models.load_model(filepath)
            logger.info(f"Model loaded from {filepath}")

        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise

    def get_model_summary(self) -> str:
        """Get model architecture summary"""
        try:
            if self.model is None:
                return "No model built yet"

            import io
            from contextlib import redirect_stdout

            f = io.StringIO()
            with redirect_stdout(f):
                self.model.summary()

            return f.getvalue()

        except Exception as e:
            logger.error(f"Error getting model summary: {str(e)}")
            return f"Error: {str(e)}"

class EnsemblePredictor:
    """Ensemble of multiple models for better predictions"""

    def __init__(self, models: List[models.Model] = None):
        self.models = models or []
        self.weights = []

    def add_model(self, model: models.Model, weight: float = 1.0) -> None:
        """Add a model to the ensemble"""
        self.models.append(model)
        self.weights.append(weight)

    def predict_ensemble(self, X: np.ndarray) -> np.ndarray:
        """Make ensemble predictions"""
        try:
            if not self.models:
                raise ValueError("No models in ensemble")

            all_predictions = []
            for model in self.models:
                pred = model.predict(X, verbose=0)
                all_predictions.append(pred)

            # Weighted average of predictions
            weights = np.array(self.weights)
            weights = weights / np.sum(weights)  # Normalize weights

            ensemble_pred = np.zeros_like(all_predictions[0])
            for pred, weight in zip(all_predictions, weights):
                ensemble_pred += pred * weight

            return ensemble_pred

        except Exception as e:
            logger.error(f"Error in ensemble prediction: {str(e)}")
            raise

    def evaluate_ensemble(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate ensemble performance"""
        try:
            ensemble_predictions = self.predict_ensemble(X)
            ensemble_classes = np.argmax(ensemble_predictions, axis=1)

            # Calculate metrics
            accuracy = np.mean(ensemble_classes == y)

            return {
                'ensemble_accuracy': accuracy,
                'ensemble_confidence': np.mean(np.max(ensemble_predictions, axis=1)),
                'individual_predictions': len(self.models)
            }

        except Exception as e:
            logger.error(f"Error evaluating ensemble: {str(e)}")
            raise

# Training script
def train_model():
    """Example training script"""
    try:
        # Generate mock data for demonstration
        sequence_length = 60
        n_features = 30
        n_samples = 10000

        # Create synthetic data
        X = np.random.randn(n_samples, sequence_length, n_features)
        # Create synthetic labels (0: SELL, 1: HOLD, 2: BUY)
        y = np.random.choice(3, n_samples, p=[0.3, 0.4, 0.3])

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Create and train model
        config = ModelConfig(
            sequence_length=sequence_length,
            n_features=n_features,
            lstm_units=[128, 64],
            epochs=50,
            batch_size=64
        )

        predictor = LSTMPricePredictor(config)
        predictor.build_model((sequence_length, n_features))
        predictor.setup_callbacks()

        # Train model
        history = predictor.train(X_train, y_train)

        # Evaluate model
        evaluation = predictor.evaluate(X_test, y_test)
        logger.info(f"Test Accuracy: {evaluation['accuracy']:.4f}")

        # Save model
        predictor.save_model('models/crypto_price_predictor.h5')

        return predictor, evaluation

    except Exception as e:
        logger.error(f"Error in training script: {str(e)}")
        raise

if __name__ == "__main__":
    # Run training if script is executed directly
    model, results = train_model()
    print(f"Training completed. Test accuracy: {results['accuracy']:.4f}")