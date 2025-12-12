"""
Fetch real market data from Binance for ML training
"""
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
import requests
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)


def fetch_binance_klines(symbol: str, interval: str, days: int = 90) -> List[List]:
    """
    Fetch historical klines from Binance API
    
    Args:
        symbol: Trading pair (e.g., 'BTCUSDT')
        interval: Timeframe ('1m', '5m', '15m', '1h', '4h', '1d')
        days: Number of days of historical data
    
    Returns:
        List of klines [timestamp, open, high, low, close, volume, ...]
    """
    base_url = "https://api.binance.com/api/v3/klines"
    
    # Calculate start time
    end_time = int(datetime.now().timestamp() * 1000)
    start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
    
    # Interval to milliseconds mapping
    interval_ms = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000
    }
    
    limit = 1000  # Max per request
    all_klines = []
    
    current_start = start_time
    
    logger.info(f"Fetching {symbol} {interval} data for {days} days...")
    
    while current_start < end_time:
        params = {
            'symbol': symbol,
            'interval': interval,
            'startTime': current_start,
            'endTime': end_time,
            'limit': limit
        }
        
        try:
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()
            klines = response.json()
            
            if not klines:
                break
            
            all_klines.extend(klines)
            logger.info(f"  Fetched {len(klines)} candles (total: {len(all_klines)})")
            
            # Move to next batch
            last_timestamp = klines[-1][0]
            current_start = last_timestamp + interval_ms.get(interval, 60000)
            
            # Small delay to avoid rate limits
            import time
            time.sleep(0.1)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching data: {e}")
            break
    
    logger.info(f"Total candles fetched: {len(all_klines)}")
    return all_klines


def klines_to_dataframe(klines: List[List]) -> pd.DataFrame:
    """
    Convert Binance klines to pandas DataFrame
    
    Args:
        klines: Raw klines from Binance API
    
    Returns:
        DataFrame with OHLCV data
    """
    df = pd.DataFrame(klines, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    # Convert to correct types
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df['open'] = df['open'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['close'] = df['close'].astype(float)
    df['volume'] = df['volume'].astype(float)
    
    # Keep only OHLCV columns
    df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
    
    return df


def save_market_data(df: pd.DataFrame, symbol: str, interval: str):
    """
    Save market data to CSV file
    
    Args:
        df: DataFrame with market data
        symbol: Trading pair
        interval: Timeframe
    """
    data_dir = Path(__file__).parent / 'data'
    data_dir.mkdir(exist_ok=True)
    
    filename = f"{symbol.lower()}_{interval}.csv"
    filepath = data_dir / filename
    
    df.to_csv(filepath, index=False)
    logger.info(f"Saved {len(df)} rows to {filepath}")
    
    return str(filepath)


def fetch_for_symbol(symbol: str, interval: str = '1h', days: int = 90) -> bool:
    """Fetch and save data for a single symbol"""
    logger.info(f"\n📥 Fetching {symbol} {interval}...")
    
    klines = fetch_binance_klines(symbol, interval, days)
    
    if not klines:
        logger.error(f"✗ No data fetched for {symbol}")
        return False
    
    df = klines_to_dataframe(klines)
    
    logger.info(f"  Rows: {len(df)}, Price: ${df['close'].iloc[-1]:.2f}")
    
    filepath = save_market_data(df, symbol, interval)
    logger.info(f"  ✓ Saved to {filepath}")
    
    return True


def fetch_all_symbols(intervals: List[str] = None, days: int = 90):
    """Fetch data for all configured symbols"""
    if intervals is None:
        intervals = ['1h', '4h']
    
    symbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
        'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT'
    ]
    
    logger.info("="*60)
    logger.info("📥 FETCHING ALL SYMBOLS")
    logger.info("="*60)
    logger.info(f"Symbols: {len(symbols)}")
    logger.info(f"Intervals: {intervals}")
    logger.info(f"Days: {days}")
    logger.info("")
    
    success_count = 0
    total = len(symbols) * len(intervals)
    
    for i, symbol in enumerate(symbols, 1):
        for interval in intervals:
            try:
                if fetch_for_symbol(symbol, interval, days):
                    success_count += 1
            except Exception as e:
                logger.error(f"Error fetching {symbol} {interval}: {e}")
            
            # Small delay to avoid rate limits
            import time
            time.sleep(0.5)
    
    logger.info("")
    logger.info("="*60)
    logger.info(f"✓ COMPLETE: {success_count}/{total} successful")
    logger.info("="*60)
    logger.info("")
    logger.info("Ready for training:")
    logger.info("  python auto_trainer.py --mode all")


def show_menu():
    """Interactive menu"""
    print("\n" + "="*60)
    print("📊 MARKET DATA FETCHER")
    print("="*60)
    print("\nOptions:")
    print("  1. 📥 Fetch all symbols (all timeframes)")
    print("  2. 🔍 Fetch specific symbol")
    print("  3. ⚙️  Fetch custom configuration")
    print("  4. ❌ Exit")
    print("")
    
    choice = input("Enter choice [1-4]: ").strip()
    
    if choice == '1':
        print("\nFetching all 10 symbols (1h + 4h)...")
        print("This will take 5-10 minutes...\n")
        fetch_all_symbols()
    
    elif choice == '2':
        symbols = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
            'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT'
        ]
        
        print("\nAvailable symbols:")
        for i, sym in enumerate(symbols, 1):
            print(f"  {i}. {sym}")
        
        try:
            sym_choice = int(input("\nSelect symbol [1-10]: "))
            if 1 <= sym_choice <= len(symbols):
                symbol = symbols[sym_choice - 1]
                interval = input("Interval [1h/4h/1d] (default 1h): ").strip() or '1h'
                days = int(input("Days of data (default 90): ") or 90)
                
                logger.info("="*60)
                logger.info(f"FETCHING {symbol}")
                logger.info("="*60)
                
                klines = fetch_binance_klines(symbol, interval, days)
                if klines:
                    df = klines_to_dataframe(klines)
                    logger.info(f"\nData Summary:")
                    logger.info(f"  Start: {df['timestamp'].min()}")
                    logger.info(f"  End: {df['timestamp'].max()}")
                    logger.info(f"  Rows: {len(df)}")
                    logger.info(f"  Price range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
                    
                    filepath = save_market_data(df, symbol, interval)
                    logger.info(f"\n✓ SUCCESS! Saved to {filepath}")
                else:
                    logger.error("No data fetched!")
            else:
                print("Invalid choice!")
        except (ValueError, KeyError):
            print("Invalid input!")
    
    elif choice == '3':
        print("\nCustom Configuration:")
        symbol = input("Symbol (e.g., BTCUSDT): ").strip().upper()
        interval = input("Interval (1m/5m/15m/1h/4h/1d, default 1h): ").strip() or '1h'
        days = int(input("Days of history (default 90): ") or 90)
        
        logger.info("="*60)
        logger.info(f"FETCHING {symbol}")
        logger.info("="*60)
        logger.info(f"Interval: {interval}")
        logger.info(f"Days: {days}")
        logger.info("")
        
        klines = fetch_binance_klines(symbol, interval, days)
        if klines:
            df = klines_to_dataframe(klines)
            logger.info(f"\nData Summary:")
            logger.info(f"  Start: {df['timestamp'].min()}")
            logger.info(f"  End: {df['timestamp'].max()}")
            logger.info(f"  Rows: {len(df)}")
            logger.info(f"  Price range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
            
            filepath = save_market_data(df, symbol, interval)
            logger.info(f"\n✓ SUCCESS! Saved to {filepath}")
        else:
            logger.error("No data fetched!")
    
    elif choice == '4':
        print("\n👋 Goodbye!")
        return
    
    else:
        print("\nInvalid choice!")


def main():
    """
    Main function to fetch and save market data
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch market data from Binance')
    parser.add_argument('--all', action='store_true', help='Fetch all symbols')
    parser.add_argument('--menu', action='store_true', help='Interactive menu')
    parser.add_argument('symbol', nargs='?', help='Trading symbol (e.g., BTCUSDT)')
    parser.add_argument('--interval', default='1h', help='Timeframe (1h, 4h, 1d)')
    parser.add_argument('--days', type=int, default=90, help='Days of history')
    
    args = parser.parse_args()
    
    # If no arguments, show menu
    if not args.all and not args.symbol and not sys.stdin.isatty():
        args.menu = True
    
    if args.all:
        fetch_all_symbols(days=args.days)
        return 0
    
    elif args.symbol:
        logger.info("="*60)
        logger.info(f"FETCHING MARKET DATA")
        logger.info("="*60)
        logger.info(f"Symbol: {args.symbol}")
        logger.info(f"Interval: {args.interval}")
        logger.info(f"Days: {args.days}")
        logger.info("")
        
        klines = fetch_binance_klines(args.symbol, args.interval, args.days)
        
        if not klines:
            logger.error("No data fetched!")
            return 1
        
        df = klines_to_dataframe(klines)
        
        logger.info("")
        logger.info("Data Summary:")
        logger.info(f"  Start: {df['timestamp'].min()}")
        logger.info(f"  End: {df['timestamp'].max()}")
        logger.info(f"  Rows: {len(df)}")
        logger.info(f"  Price range: ${df['low'].min():.2f} - ${df['high'].max():.2f}")
        
        filepath = save_market_data(df, args.symbol, args.interval)
        
        logger.info("")
        logger.info("="*60)
        logger.info(f"SUCCESS! Data saved to {filepath}")
        logger.info("="*60)
        
        return 0
    
    else:
        show_menu()
        return 0


if __name__ == '__main__':
    sys.exit(main())
