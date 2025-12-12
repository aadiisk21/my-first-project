# Python 3.14 ML Setup - Windows Troubleshooting

## Issue: NumPy Compilation Error on Windows

If you get "Unknown compiler" errors, NumPy is trying to compile from source but lacks a C compiler.

### Solution 1: Install Pre-built Wheels (Recommended)

```bash
cd ml

# Update pip first
pip install --upgrade pip

# Install packages with pre-built wheels
pip install numpy pandas scikit-learn xgboost lightgbm ta joblib matplotlib seaborn --prefer-binary
```

### Solution 2: Use Conda (If Available)

```bash
conda create -n trading-ml python=3.14
conda activate trading-ml
conda install numpy pandas scikit-learn xgboost lightgbm matplotlib seaborn
pip install ta  # Not available in conda
```

### Solution 3: Downgrade to Python 3.12 (Most Stable)

Python 3.14 is very new. For production use, Python 3.12 is more stable:

```bash
# Download Python 3.12 from python.org
# Then:
py -3.12 -m pip install -r requirements.txt
```

### Solution 4: Install Visual Studio Build Tools (If you need to compile)

1. Download: https://visualstudio.microsoft.com/downloads/
2. Install "Desktop development with C++"
3. Restart terminal
4. Run: `pip install -r requirements.txt`

### Verify Installation

```bash
python -c "import numpy, pandas, sklearn, xgboost, lightgbm; print('Success!')"
```

### Minimal Installation (If All Else Fails)

You can use the backend's technical analysis WITHOUT Python ML:

```bash
# The backend signalGenerator.ts already has 50+ indicators
# and works without Python ML models
npm run backend:dev
```

The AI signal generation works using TypeScript-based technical indicators. Python ML is an **optional enhancement** for even higher accuracy.

### Quick Test

```bash
cd ml
python test_ml_setup.py
```

This will show which packages are installed and which are missing.
