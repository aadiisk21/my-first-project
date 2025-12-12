"""
Quick status check for ML system
"""
import json
from pathlib import Path
from datetime import datetime, timedelta
import sys

def check_status():
    print("\n" + "="*60)
    print("🧠 ML SYSTEM STATUS CHECK")
    print("="*60 + "\n")
    
    ml_dir = Path(__file__).parent
    
    # Check models
    models_dir = ml_dir / 'models'
    models = list(models_dir.glob('*.pkl'))
    
    print(f"📦 Trained Models: {len(models)}")
    if models:
        for model in sorted(models)[:5]:
            age = datetime.now() - datetime.fromtimestamp(model.stat().st_mtime)
            print(f"   • {model.stem}: {age.days}d {age.seconds//3600}h old")
        if len(models) > 5:
            print(f"   ... and {len(models)-5} more")
    else:
        print("   ⚠️  No models found. Run: python auto_trainer.py --mode all")
    
    print()
    
    # Check data
    data_dir = ml_dir / 'data'
    data_files = list(data_dir.glob('*.csv'))
    
    print(f"📊 Market Data Files: {len(data_files)}")
    if data_files:
        total_size = sum(f.stat().st_size for f in data_files) / (1024*1024)
        print(f"   Total size: {total_size:.1f} MB")
    else:
        print("   ⚠️  No data files. Run: python fetch_market_data.py BTCUSDT 1h 90")
    
    print()
    
    # Check feedback
    feedback_file = ml_dir / 'feedback' / 'signals.jsonl'
    
    if feedback_file.exists():
        with open(feedback_file, 'r') as f:
            signals = [json.loads(line) for line in f if line.strip()]
        
        closed = [s for s in signals if s.get('status') == 'CLOSED']
        active = [s for s in signals if s.get('status') == 'ACTIVE']
        
        print(f"📝 Signal Feedback:")
        print(f"   Total signals: {len(signals)}")
        print(f"   Active: {len(active)}")
        print(f"   Closed: {len(closed)}")
        
        if closed:
            successful = [s for s in closed if s.get('outcome') in ['SUCCESS', 'TOOK_PROFIT']]
            success_rate = len(successful) / len(closed) * 100
            avg_pl = sum(s.get('profit_loss', 0) for s in closed) / len(closed)
            
            print(f"   Success rate: {success_rate:.1f}%")
            print(f"   Avg return: {avg_pl:+.2f}%")
            
            # Check if learning
            if len(closed) >= 10:
                print("   ✅ Sufficient feedback for learning")
            else:
                print(f"   ⏳ Need {10-len(closed)} more closed signals for learning")
    else:
        print("📝 Signal Feedback: No data yet")
        print("   Signals will be tracked when generated")
    
    print()
    
    # Check config
    config_file = ml_dir / 'training_config.json'
    if config_file.exists():
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        print(f"⚙️  Configuration:")
        print(f"   Symbols: {len(config.get('symbols', []))}")
        print(f"   Timeframes: {config.get('timeframes', [])}")
        print(f"   Retrain interval: {config.get('retrain_interval_hours', 24)}h")
    
    print()
    
    # Recommendations
    print("💡 Recommendations:")
    
    if len(models) == 0:
        print("   1. Train models: python auto_trainer.py --mode all")
    elif len(models) < 10:
        print("   1. Complete training: python auto_trainer.py --mode all")
    
    if feedback_file.exists() and len(closed) < 10:
        print(f"   2. Wait for {10-len(closed)} more signals to close")
    
    if len(models) > 0:
        oldest = min(models, key=lambda p: p.stat().st_mtime)
        age = datetime.now() - datetime.fromtimestamp(oldest.stat().st_mtime)
        if age > timedelta(days=1):
            print(f"   3. Retrain old models: python auto_trainer.py --mode retrain")
    
    print("   4. Start auto-learning: python learning_scheduler.py --mode run")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    try:
        check_status()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
