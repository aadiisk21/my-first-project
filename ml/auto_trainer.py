"""
Automatic trainer for multiple trading symbols
Trains ML models for all configured symbols and timeframes
"""
import os
import sys
import logging
import json
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import time
import subprocess

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)


class AutoTrainer:
    """Automatically trains models for multiple symbols"""
    
    def __init__(self, config_path: str = 'training_config.json', verbose: bool = True):
        self.config_path = Path(__file__).parent / config_path
        self.config = self.load_config()
        self.models_dir = Path(__file__).parent / 'models'
        self.models_dir.mkdir(exist_ok=True)
        self.data_dir = Path(__file__).parent / 'data'
        self.data_dir.mkdir(exist_ok=True)
        self.verbose = verbose
        
    def load_config(self) -> Dict:
        """Load training configuration"""
        default_config = {
            "symbols": [
                "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
                "ADAUSDT", "DOGEUSDT", "MATICUSDT", "DOTUSDT", "AVAXUSDT"
            ],
            "timeframes": ["1h", "4h"],
            "days_history": 90,
            "retrain_interval_hours": 24,
            "min_candles": 100,
            "parallel_training": 3
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    # Merge with defaults
                    return {**default_config, **config}
            except Exception as e:
                logger.warning(f"Failed to load config: {e}, using defaults")
        
        # Save default config
        with open(self.config_path, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        return default_config
    
    def fetch_data(self, symbol: str, timeframe: str, days: int) -> str:
        """Fetch market data for symbol"""
        logger.info(f"📥 Fetching {symbol} {timeframe} data...")
        
        try:
            # Stream output live
            proc = subprocess.Popen(
                [
                    sys.executable, 'fetch_market_data.py',
                    symbol,
                    '--interval', timeframe,
                    '--days', str(days)
                ],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            for line in proc.stdout:
                if self.verbose:
                    print(line.rstrip())
            returncode = proc.wait(timeout=600)

            if returncode == 0:
                data_file = self.data_dir / f"{symbol.lower()}_{timeframe}.csv"
                if data_file.exists():
                    logger.info(f"✓ Data fetched: {data_file}")
                    return str(data_file)
                else:
                    logger.error(f"✗ Data file not found: {data_file}")
                    return None
            else:
                logger.error(f"✗ Failed to fetch data (exit {returncode})")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error fetching data: {e}")
            return None
    
    def train_model(self, symbol: str, timeframe: str) -> bool:
        """Train model for symbol/timeframe"""
        logger.info(f"🤖 Training {symbol} {timeframe} model...")
        
        data_file = self.data_dir / f"{symbol.lower()}_{timeframe}.csv"
        
        if not data_file.exists():
            logger.warning(f"Data file not found, fetching: {data_file}")
            data_file = self.fetch_data(
                symbol, 
                timeframe, 
                self.config['days_history']
            )
            if not data_file:
                return False
        
        model_file = self.models_dir / f"{symbol.lower()}_{timeframe}_ensemble.pkl"
        
        try:
            # Stream trainer output
            proc = subprocess.Popen(
                [
                    sys.executable, 'trainer.py',
                    '--mode', 'train',
                    '--symbol', symbol,
                    '--timeframe', timeframe
                ],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )

            for line in proc.stdout:
                if self.verbose:
                    print(line.rstrip())
            returncode = proc.wait()

            if returncode == 0 and model_file.exists():
                logger.info(f"✓ Model trained: {model_file}")
                
                # Save training metadata
                metadata = {
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'trained_at': datetime.now().isoformat(),
                    'data_file': str(data_file),
                    'model_file': str(model_file)
                }
                
                metadata_file = model_file.with_suffix('.json')
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                return True
            else:
                logger.error(f"✗ Training failed (exit {returncode})")
                return False
                
        except Exception as e:
            logger.error(f"✗ Error training model: {e}")
            return False
    
    def train_all(self) -> Dict:
        """Train models for all configured symbols"""
        logger.info("="*60)
        logger.info("AUTO TRAINER - TRAINING ALL SYMBOLS")
        logger.info("="*60)
        logger.info(f"Symbols: {', '.join(self.config['symbols'])}")
        logger.info(f"Timeframes: {', '.join(self.config['timeframes'])}")
        logger.info("")
        
        results = {
            'started_at': datetime.now().isoformat(),
            'symbols': {},
            'success': 0,
            'failed': 0,
            'total': 0
        }
        
        # Optional progress bar
        try:
            from tqdm import tqdm
            symbols_iter = tqdm(self.config['symbols'], desc='Symbols', unit='sym') if self.verbose else self.config['symbols']
        except Exception:
            symbols_iter = self.config['symbols']

        for symbol in symbols_iter:
            results['symbols'][symbol] = {}
            try:
                from tqdm import tqdm
                tf_iter = tqdm(self.config['timeframes'], desc=f'{symbol} timeframes', unit='tf', leave=False) if self.verbose else self.config['timeframes']
            except Exception:
                tf_iter = self.config['timeframes']

            for timeframe in tf_iter:
                results['total'] += 1
                key = f"{symbol}_{timeframe}"

                logger.info(f"\n[{results['total']}] Training {key}...")

                success = self.train_model(symbol, timeframe)
                results['symbols'][symbol][timeframe] = {
                    'success': success,
                    'timestamp': datetime.now().isoformat()
                }
                
                if success:
                    results['success'] += 1
                else:
                    results['failed'] += 1
                
                # Small delay between trainings
                time.sleep(2)
        
        results['finished_at'] = datetime.now().isoformat()
        
        # Save results
        results_file = self.models_dir / 'training_results.json'
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info("\n" + "="*60)
        logger.info("TRAINING COMPLETE")
        logger.info("="*60)
        logger.info(f"Total: {results['total']}")
        logger.info(f"Success: {results['success']} ✓")
        logger.info(f"Failed: {results['failed']} ✗")
        logger.info(f"Success rate: {results['success']/results['total']*100:.1f}%")
        logger.info(f"\nResults saved to: {results_file}")
        
        return results

def parse_args():
    import argparse
    p = argparse.ArgumentParser(description='Auto-train models for multiple symbols/timeframes')
    p.add_argument('--mode', choices=['all','symbol','retrain'], default='all')
    p.add_argument('--symbol', type=str, help='Single symbol to train')
    p.add_argument('--timeframe', type=str, help='Single timeframe to train')
    p.add_argument('--verbose', action='store_true', help='Stream logs and show progress bars')
    return p.parse_args()

if __name__ == '__main__':
    args = parse_args()
    trainer = AutoTrainer(verbose=args.verbose)
    if args.mode == 'symbol':
        if not args.symbol or not args.timeframe:
            print('Please provide --symbol and --timeframe for mode symbol')
            sys.exit(2)
        ok = trainer.train_model(args.symbol, args.timeframe)
        sys.exit(0 if ok else 1)
    elif args.mode == 'retrain':
        trainer.retrain_existing()
    else:
        trainer.train_all()
    
    def retrain_existing(self, max_age_hours: int = None) -> Dict:
        """Retrain existing models that are older than max_age_hours"""
        if max_age_hours is None:
            max_age_hours = self.config.get('retrain_interval_hours', 24)
        
        logger.info(f"🔄 Retraining models older than {max_age_hours} hours...")
        
        results = {
            'started_at': datetime.now().isoformat(),
            'retrained': 0,
            'skipped': 0,
            'failed': 0
        }
        
        # Find all model metadata files
        for metadata_file in self.models_dir.glob('*.json'):
            if metadata_file.name == 'training_results.json':
                continue
            
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                trained_at = datetime.fromisoformat(metadata['trained_at'])
                age_hours = (datetime.now() - trained_at).total_seconds() / 3600
                
                if age_hours > max_age_hours:
                    symbol = metadata['symbol']
                    timeframe = metadata['timeframe']
                    
                    logger.info(f"Retraining {symbol} {timeframe} (age: {age_hours:.1f}h)...")
                    
                    if self.train_model(symbol, timeframe):
                        results['retrained'] += 1
                    else:
                        results['failed'] += 1
                else:
                    logger.info(f"Skipping {metadata['symbol']} {metadata['timeframe']} (age: {age_hours:.1f}h)")
                    results['skipped'] += 1
                    
            except Exception as e:
                logger.error(f"Error processing {metadata_file}: {e}")
                results['failed'] += 1
        
        results['finished_at'] = datetime.now().isoformat()
        
        logger.info(f"\n✓ Retrained: {results['retrained']}")
        logger.info(f"⊘ Skipped: {results['skipped']}")
        logger.info(f"✗ Failed: {results['failed']}")
        
        return results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Auto-train ML models for multiple symbols')
    parser.add_argument('--mode', type=str, default='all', 
                       choices=['all', 'retrain', 'symbol'],
                       help='Training mode: all (train all), retrain (update old models), symbol (train specific)')
    parser.add_argument('--symbol', type=str, help='Specific symbol to train')
    parser.add_argument('--timeframe', type=str, default='1h', help='Timeframe for specific symbol')
    parser.add_argument('--max-age', type=int, help='Max age in hours for retrain mode')
    
    args = parser.parse_args()
    
    trainer = AutoTrainer()
    
    if args.mode == 'all':
        trainer.train_all()
    elif args.mode == 'retrain':
        trainer.retrain_existing(max_age_hours=args.max_age)
    elif args.mode == 'symbol':
        if not args.symbol:
            logger.error("--symbol required for 'symbol' mode")
            sys.exit(1)
        trainer.train_model(args.symbol, args.timeframe)


if __name__ == '__main__':
    main()
