"""
Quick test of ML ensemble model for price prediction
"""
import sys
import json

# Test if we have the required packages
try:
    import numpy as np
    print("✓ NumPy installed")
except ImportError:
    print("✗ NumPy missing - install with: pip install numpy")
    sys.exit(1)

try:
    import pandas as pd
    print("✓ Pandas installed")
except ImportError:
    print("✗ Pandas missing - install with: pip install pandas")
    sys.exit(1)

try:
    from sklearn.ensemble import RandomForestClassifier
    print("✓ Scikit-learn installed")
except ImportError:
    print("✗ Scikit-learn missing - install with: pip install scikit-learn")
    sys.exit(1)

try:
    import xgboost as xgb
    print("✓ XGBoost installed")
except ImportError:
    print("✗ XGBoost missing - install with: pip install xgboost")
    sys.exit(1)

try:
    import lightgbm as lgb
    print("✓ LightGBM installed")
except ImportError:
    print("✗ LightGBM missing - install with: pip install lightgbm")
    sys.exit(1)

print("\n✅ All core ML packages are installed!")
print("\n🤖 Testing ensemble model creation...")

# Create a simple test
try:
    # Generate sample data
    X = np.random.randn(100, 10)
    y = np.random.randint(0, 3, 100)
    
    # Test Random Forest
    rf = RandomForestClassifier(n_estimators=10, random_state=42)
    rf.fit(X, y)
    rf_pred = rf.predict_proba(X[:1])
    print(f"✓ Random Forest prediction: {rf_pred}")
    
    # Test XGBoost
    xgb_model = xgb.XGBClassifier(n_estimators=10, random_state=42, verbosity=0)
    xgb_model.fit(X, y)
    xgb_pred = xgb_model.predict_proba(X[:1])
    print(f"✓ XGBoost prediction: {xgb_pred}")
    
    # Test LightGBM
    lgb_model = lgb.LGBMClassifier(n_estimators=10, random_state=42, verbosity=-1)
    lgb_model.fit(X, y)
    lgb_pred = lgb_model.predict_proba(X[:1])
    print(f"✓ LightGBM prediction: {lgb_pred}")
    
    # Ensemble average
    ensemble_pred = (rf_pred + xgb_pred + lgb_pred) / 3
    signal_idx = np.argmax(ensemble_pred)
    signals = ['SELL', 'HOLD', 'BUY']
    confidence = float(ensemble_pred[0][signal_idx] * 100)
    
    print(f"\n🎯 Ensemble Result:")
    print(f"   Signal: {signals[signal_idx]}")
    print(f"   Confidence: {confidence:.1f}%")
    print(f"\n✅ ML price prediction model is ready!")
    
except Exception as e:
    print(f"\n✗ Error testing models: {e}")
    sys.exit(1)
