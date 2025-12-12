"""
Signal outcome tracking and feedback collection
Tracks whether signals succeed or fail for continuous learning
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SignalFeedbackCollector:
    """Collects feedback on signal performance for model improvement"""
    
    def __init__(self, feedback_dir: str = 'feedback'):
        self.feedback_dir = Path(__file__).parent / feedback_dir
        self.feedback_dir.mkdir(exist_ok=True)
        self.signals_db = self.feedback_dir / 'signals.jsonl'
        
    def record_signal(self, signal: Dict) -> str:
        """Record a generated signal"""
        signal_id = signal.get('id', f"signal_{datetime.now().timestamp()}")
        
        record = {
            'signal_id': signal_id,
            'symbol': signal.get('pair', signal.get('symbol')),
            'timeframe': signal.get('timeframe', '1h'),
            'signal_type': signal.get('signalType', signal.get('signal_type')),
            'confidence': signal.get('confidence', 0),
            'entry_price': signal.get('entryPrice', signal.get('entry_price')),
            'stop_loss': signal.get('stopLoss', signal.get('stop_loss')),
            'take_profit': signal.get('takeProfit', signal.get('take_profit')),
            'timestamp': signal.get('timestamp', datetime.now().isoformat()),
            'indicators': signal.get('indicators', {}),
            'ml_prediction': signal.get('mlPrediction'),
            'status': 'ACTIVE',
            'outcome': None,
            'profit_loss': None,
            'exit_price': None,
            'exit_time': None
        }
        
        # Append to JSONL file
        with open(self.signals_db, 'a') as f:
            f.write(json.dumps(record) + '\n')
        
        logger.info(f"📝 Recorded signal: {signal_id}")
        return signal_id
    
    def update_signal_outcome(
        self, 
        signal_id: str, 
        outcome: str,  # 'SUCCESS', 'FAILURE', 'STOPPED_OUT', 'TOOK_PROFIT'
        exit_price: float,
        profit_loss_percent: float
    ):
        """Update signal with actual outcome"""
        signals = self.load_signals()
        
        updated = False
        for signal in signals:
            if signal['signal_id'] == signal_id:
                signal['status'] = 'CLOSED'
                signal['outcome'] = outcome
                signal['exit_price'] = exit_price
                signal['profit_loss'] = profit_loss_percent
                signal['exit_time'] = datetime.now().isoformat()
                updated = True
                break
        
        if updated:
            # Rewrite entire file
            with open(self.signals_db, 'w') as f:
                for signal in signals:
                    f.write(json.dumps(signal) + '\n')
            
            logger.info(f"✓ Updated signal {signal_id}: {outcome} ({profit_loss_percent:+.2f}%)")
        else:
            logger.warning(f"⚠ Signal not found: {signal_id}")
    
    def load_signals(self, days: int = None) -> List[Dict]:
        """Load all recorded signals"""
        if not self.signals_db.exists():
            return []
        
        signals = []
        with open(self.signals_db, 'r') as f:
            for line in f:
                if line.strip():
                    signal = json.loads(line)
                    
                    # Filter by date if specified
                    if days:
                        signal_time = datetime.fromisoformat(signal['timestamp'])
                        if datetime.now() - signal_time > timedelta(days=days):
                            continue
                    
                    signals.append(signal)
        
        return signals
    
    def get_performance_stats(
        self, 
        symbol: str = None, 
        timeframe: str = None,
        days: int = 30
    ) -> Dict:
        """Calculate performance statistics"""
        signals = self.load_signals(days=days)
        
        # Filter by symbol and timeframe
        if symbol:
            signals = [s for s in signals if s['symbol'] == symbol]
        if timeframe:
            signals = [s for s in signals if s['timeframe'] == timeframe]
        
        # Only closed signals
        closed_signals = [s for s in signals if s['status'] == 'CLOSED']
        
        if not closed_signals:
            return {
                'total_signals': len(signals),
                'closed_signals': 0,
                'success_rate': 0,
                'avg_profit_loss': 0,
                'total_return': 0
            }
        
        successful = [s for s in closed_signals if s['outcome'] in ['SUCCESS', 'TOOK_PROFIT']]
        failed = [s for s in closed_signals if s['outcome'] in ['FAILURE', 'STOPPED_OUT']]
        
        total_pl = sum(s['profit_loss'] for s in closed_signals if s['profit_loss'])
        avg_pl = total_pl / len(closed_signals) if closed_signals else 0
        
        return {
            'total_signals': len(signals),
            'active_signals': len(signals) - len(closed_signals),
            'closed_signals': len(closed_signals),
            'successful': len(successful),
            'failed': len(failed),
            'success_rate': len(successful) / len(closed_signals) * 100 if closed_signals else 0,
            'avg_profit_loss': avg_pl,
            'total_return': total_pl,
            'best_signal': max(closed_signals, key=lambda s: s.get('profit_loss', -999), default=None),
            'worst_signal': min(closed_signals, key=lambda s: s.get('profit_loss', 999), default=None)
        }
    
    def get_feedback_data(
        self, 
        symbol: str,
        timeframe: str,
        min_samples: int = 10
    ) -> Optional[pd.DataFrame]:
        """Get feedback data for model retraining"""
        signals = self.load_signals()
        
        # Filter by symbol, timeframe, and closed status
        feedback_signals = [
            s for s in signals
            if s['symbol'] == symbol 
            and s['timeframe'] == timeframe
            and s['status'] == 'CLOSED'
            and s['profit_loss'] is not None
        ]
        
        if len(feedback_signals) < min_samples:
            logger.warning(f"Insufficient feedback data: {len(feedback_signals)} < {min_samples}")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(feedback_signals)
        
        # Calculate reward signal for reinforcement learning
        # Positive reward for profitable signals, negative for losses
        df['reward'] = df['profit_loss'].apply(
            lambda pl: 1 if pl > 0 else -1 if pl < 0 else 0
        )
        
        # Weight by magnitude of profit/loss
        df['weighted_reward'] = df['profit_loss'] / 100  # Normalize to -1 to 1 range
        
        logger.info(f"✓ Loaded {len(df)} feedback samples for {symbol} {timeframe}")
        logger.info(f"  Success rate: {(df['reward'] > 0).sum() / len(df) * 100:.1f}%")
        logger.info(f"  Avg return: {df['profit_loss'].mean():.2f}%")
        
        return df
    
    def export_training_data(
        self,
        symbol: str,
        timeframe: str,
        output_file: str = None
    ) -> str:
        """Export feedback as training data"""
        df = self.get_feedback_data(symbol, timeframe)
        
        if df is None:
            return None
        
        if output_file is None:
            output_file = self.feedback_dir / f"{symbol.lower()}_{timeframe}_feedback.csv"
        
        df.to_csv(output_file, index=False)
        logger.info(f"💾 Exported feedback data to: {output_file}")
        
        return str(output_file)


def main():
    """Handle feedback operations from stdin (for Node.js integration)"""
    import sys
    
    collector = SignalFeedbackCollector()
    
    # Read input from stdin
    if not sys.stdin.isatty():
        try:
            input_data = sys.stdin.read()
            request = json.loads(input_data)
            action = request.get('action')
            data = request.get('data', {})
            
            if action == 'record':
                signal_id = collector.record_signal(data)
                print(json.dumps({'success': True, 'signal_id': signal_id}))
            
            elif action == 'update':
                collector.update_signal_outcome(
                    data['signalId'],
                    data['outcome'],
                    data.get('exitPrice', 0),
                    data.get('profitLossPercent', 0)
                )
                print(json.dumps({'success': True}))
            
            elif action == 'stats':
                stats = collector.get_performance_stats(
                    symbol=data.get('symbol'),
                    timeframe=data.get('timeframe'),
                    days=data.get('days', 30)
                )
                print(json.dumps({'success': True, 'data': stats}))
            
            else:
                print(json.dumps({'success': False, 'error': f'Unknown action: {action}'}))
                
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}))
    else:
        # Test mode
        test_signal = {
            'id': 'test_signal_001',
            'pair': 'BTCUSDT',
            'timeframe': '1h',
            'signalType': 'BUY',
            'confidence': 75,
            'entryPrice': 43000,
            'stopLoss': 42500,
            'takeProfit': 44000,
            'timestamp': datetime.now().isoformat()
        }
        
        collector.record_signal(test_signal)
        
        # Get stats
        stats = collector.get_performance_stats()
        print("\n📊 Performance Stats:")
        print(json.dumps(stats, indent=2, default=str))


if __name__ == '__main__':
    main()
