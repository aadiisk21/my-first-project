"""
Automated Learning Scheduler
Runs periodic retraining and continuous learning
"""
import schedule
import time
import logging
import json
from pathlib import Path
from datetime import datetime
import subprocess
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LearningScheduler:
    """Schedules automated model retraining and improvements"""
    
    def __init__(self, config_path: str = 'scheduler_config.json'):
        self.config_path = Path(__file__).parent / config_path
        self.config = self.load_config()
        self.running = False
        
    def load_config(self) -> dict:
        """Load scheduler configuration"""
        default_config = {
            "enabled": True,
            "schedules": {
                "fetch_data": {
                    "interval": "1h",
                    "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
                },
                "retrain_full": {
                    "interval": "24h",
                    "time": "02:00"  # 2 AM daily
                },
                "incremental_update": {
                    "interval": "6h"
                },
                "evaluate_performance": {
                    "interval": "12h"
                }
            },
            "min_feedback_samples": 10,
            "auto_retrain_on_poor_performance": True,
            "poor_performance_threshold": 40  # Success rate %
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    return {**default_config, **config}
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")
        
        # Save default
        with open(self.config_path, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        return default_config
    
    def fetch_new_data(self):
        """Fetch latest market data for all symbols"""
        logger.info("📥 Fetching new market data...")
        
        symbols = self.config['schedules']['fetch_data']['symbols']
        
        for symbol in symbols:
            try:
                result = subprocess.run(
                    [sys.executable, 'fetch_market_data.py', symbol, '1h', '7'],
                    cwd=Path(__file__).parent,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if result.returncode == 0:
                    logger.info(f"✓ Fetched {symbol}")
                else:
                    logger.error(f"✗ Failed to fetch {symbol}: {result.stderr[-200:]}")
                    
            except Exception as e:
                logger.error(f"Error fetching {symbol}: {e}")
    
    def full_retrain(self):
        """Run full retraining for all models"""
        logger.info("🤖 Starting full retraining...")
        
        try:
            result = subprocess.run(
                [sys.executable, 'auto_trainer.py', '--mode', 'retrain'],
                cwd=Path(__file__).parent,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                logger.info("✓ Full retraining completed")
                logger.info(result.stdout[-500:])
            else:
                logger.error(f"✗ Retraining failed: {result.stderr[-500:]}")
                
        except Exception as e:
            logger.error(f"Error during retraining: {e}")
    
    def incremental_update(self):
        """Run incremental updates with recent data"""
        logger.info("🔄 Running incremental updates...")
        
        symbols = self.config['schedules']['fetch_data']['symbols']
        
        for symbol in symbols:
            try:
                result = subprocess.run(
                    [
                        sys.executable, 'continuous_learner.py',
                        '--symbol', symbol,
                        '--timeframe', '1h',
                        '--mode', 'incremental'
                    ],
                    cwd=Path(__file__).parent,
                    capture_output=True,
                    text=True,
                    timeout=600
                )
                
                if result.returncode == 0:
                    logger.info(f"✓ Updated {symbol}")
                else:
                    logger.error(f"✗ Update failed for {symbol}")
                    
            except Exception as e:
                logger.error(f"Error updating {symbol}: {e}")
    
    def evaluate_performance(self):
        """Evaluate model performance and trigger retraining if needed"""
        logger.info("📊 Evaluating model performance...")
        
        from feedback_collector import SignalFeedbackCollector
        
        collector = SignalFeedbackCollector()
        symbols = self.config['schedules']['fetch_data']['symbols']
        
        for symbol in symbols:
            stats = collector.get_performance_stats(symbol=symbol, days=7)
            
            if stats['closed_signals'] < self.config['min_feedback_samples']:
                logger.info(f"{symbol}: Insufficient data ({stats['closed_signals']} signals)")
                continue
            
            success_rate = stats['success_rate']
            logger.info(f"{symbol}: {success_rate:.1f}% success rate")
            
            # Trigger retraining if performance is poor
            if (self.config['auto_retrain_on_poor_performance'] and 
                success_rate < self.config['poor_performance_threshold']):
                
                logger.warning(f"⚠️ {symbol} performance below threshold, triggering retrain...")
                
                try:
                    subprocess.run(
                        [
                            sys.executable, 'continuous_learner.py',
                            '--symbol', symbol,
                            '--timeframe', '1h',
                            '--mode', 'retrain'
                        ],
                        cwd=Path(__file__).parent,
                        timeout=600
                    )
                    logger.info(f"✓ Retrained {symbol}")
                except Exception as e:
                    logger.error(f"Error retraining {symbol}: {e}")
    
    def setup_schedules(self):
        """Setup all scheduled tasks"""
        logger.info("⚙️ Setting up schedules...")
        
        schedules_config = self.config['schedules']
        
        # Fetch data every hour
        if 'fetch_data' in schedules_config:
            interval = schedules_config['fetch_data']['interval']
            if interval == '1h':
                schedule.every().hour.do(self.fetch_new_data)
                logger.info("  📥 Data fetch: every hour")
        
        # Full retrain daily at specific time
        if 'retrain_full' in schedules_config:
            retrain_time = schedules_config['retrain_full'].get('time', '02:00')
            schedule.every().day.at(retrain_time).do(self.full_retrain)
            logger.info(f"  🤖 Full retrain: daily at {retrain_time}")
        
        # Incremental updates every 6 hours
        if 'incremental_update' in schedules_config:
            interval = schedules_config['incremental_update']['interval']
            if interval == '6h':
                schedule.every(6).hours.do(self.incremental_update)
                logger.info("  🔄 Incremental update: every 6 hours")
        
        # Performance evaluation every 12 hours
        if 'evaluate_performance' in schedules_config:
            interval = schedules_config['evaluate_performance']['interval']
            if interval == '12h':
                schedule.every(12).hours.do(self.evaluate_performance)
                logger.info("  📊 Performance eval: every 12 hours")
        
        logger.info("✓ Schedules configured")
    
    def run(self):
        """Start the scheduler"""
        if not self.config['enabled']:
            logger.info("Scheduler is disabled in config")
            return
        
        logger.info("="*60)
        logger.info("🚀 LEARNING SCHEDULER STARTED")
        logger.info("="*60)
        
        self.setup_schedules()
        self.running = True
        
        # Run initial data fetch
        logger.info("\n🎬 Running initial data fetch...")
        self.fetch_new_data()
        
        logger.info("\n⏰ Scheduler running... Press Ctrl+C to stop")
        logger.info("="*60 + "\n")
        
        try:
            while self.running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
                
        except KeyboardInterrupt:
            logger.info("\n\n⏹️ Scheduler stopped by user")
            self.running = False
    
    def run_once(self, task: str):
        """Run a specific task once"""
        logger.info(f"Running task: {task}")
        
        if task == 'fetch':
            self.fetch_new_data()
        elif task == 'retrain':
            self.full_retrain()
        elif task == 'update':
            self.incremental_update()
        elif task == 'evaluate':
            self.evaluate_performance()
        else:
            logger.error(f"Unknown task: {task}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Automated learning scheduler')
    parser.add_argument('--mode', type=str, default='run',
                       choices=['run', 'once'],
                       help='Run continuously or run task once')
    parser.add_argument('--task', type=str,
                       choices=['fetch', 'retrain', 'update', 'evaluate'],
                       help='Task to run once')
    
    args = parser.parse_args()
    
    scheduler = LearningScheduler()
    
    if args.mode == 'run':
        scheduler.run()
    elif args.mode == 'once':
        if not args.task:
            logger.error("--task required for 'once' mode")
            sys.exit(1)
        scheduler.run_once(args.task)


if __name__ == '__main__':
    main()
