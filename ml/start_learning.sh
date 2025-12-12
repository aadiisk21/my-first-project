#!/bin/bash
# Quick start script for self-learning AI system

echo "🧠 Self-Learning AI Trading Bot - Quick Start"
echo "============================================="
echo ""

# Check if we're in the ml directory
if [ ! -f "auto_trainer.py" ]; then
    cd ml 2>/dev/null || {
        echo "❌ Error: Please run from project root or ml directory"
        exit 1
    }
fi

# Function to show menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "1. 🚀 Train all symbols (first time setup)"
    echo "2. 🔄 Retrain existing models with new data"
    echo "3. 📊 Check performance statistics"
    echo "4. ⏰ Start automated scheduler (continuous learning)"
    echo "5. 🧪 Train single symbol (test)"
    echo "6. 📈 Evaluate model improvement"
    echo "7. ❌ Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1)
            echo ""
            echo "🚀 Training all symbols... This will take 30-60 minutes"
            echo ""
            python auto_trainer.py --mode all --verbose
            echo ""
            read -p "Press Enter to continue..."
            ;;
        2)
            echo ""
            echo "🔄 Retraining models older than 24 hours..."
            echo ""
            python auto_trainer.py --mode retrain --verbose
            echo ""
            read -p "Press Enter to continue..."
            ;;
        3)
            echo ""
            echo "📊 Performance Statistics:"
            echo ""
            python feedback_collector.py
            echo ""
            read -p "Press Enter to continue..."
            ;;
        4)
            echo ""
            echo "⏰ Starting automated scheduler..."
            echo "   - Fetches data every hour"
            echo "   - Retrains daily at 2 AM"
            echo "   - Updates every 6 hours"
            echo "   - Press Ctrl+C to stop"
            echo ""
            python learning_scheduler.py --mode run
            ;;
        5)
            echo ""
            read -p "Enter symbol (e.g., BTCUSDT): " symbol
            read -p "Enter timeframe (e.g., 1h, 4h): " timeframe
            echo ""
            echo "🧪 Training $symbol $timeframe..."
            echo ""
            python auto_trainer.py --mode symbol --symbol "$symbol" --timeframe "$timeframe" --verbose
            echo ""
            read -p "Press Enter to continue..."
            ;;
        6)
            echo ""
            read -p "Enter symbol (e.g., BTCUSDT): " symbol
            read -p "Enter timeframe (e.g., 1h): " timeframe
            echo ""
            python continuous_learner.py --symbol "$symbol" --timeframe "$timeframe" --mode evaluate
            echo ""
            read -p "Press Enter to continue..."
            ;;
        7)
            echo ""
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo ""
            echo "❌ Invalid choice. Please enter 1-7"
            sleep 2
            ;;
    esac
done
