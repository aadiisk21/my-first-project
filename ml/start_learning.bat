@echo off
REM Quick start script for Windows
REM Self-Learning AI Trading Bot

:menu
cls
echo.
echo ============================================
echo  🧠 Self-Learning AI Trading Bot
echo ============================================
echo.
echo What would you like to do?
echo.
echo 1. 🚀 Train all symbols (first time setup)
echo 2. 🔄 Retrain existing models with new data
echo 3. 📊 Check performance statistics
echo 4. ⏰ Start automated scheduler
echo 5. 🧪 Train single symbol
echo 6. 📈 Evaluate model improvement
echo 7. ❌ Exit
echo.

set /p choice="Enter choice [1-7]: "

if "%choice%"=="1" goto train_all
if "%choice%"=="2" goto retrain
if "%choice%"=="3" goto stats
if "%choice%"=="4" goto scheduler
if "%choice%"=="5" goto train_single
if "%choice%"=="6" goto evaluate
if "%choice%"=="7" goto exit
goto invalid

:train_all
cls
echo.
echo 🚀 Training all symbols...
echo This will take 30-60 minutes
echo.
python auto_trainer.py --mode all --verbose
echo.
pause
goto menu

:retrain
cls
echo.
echo 🔄 Retraining models older than 24 hours...
echo.
python auto_trainer.py --mode retrain --verbose
echo.
pause
goto menu

:stats
cls
echo.
echo 📊 Performance Statistics:
echo.
python feedback_collector.py
echo.
pause
goto menu

:scheduler
cls
echo.
echo ⏰ Starting automated scheduler...
echo    - Fetches data every hour
echo    - Retrains daily at 2 AM
echo    - Updates every 6 hours
echo    - Press Ctrl+C to stop
echo.
python learning_scheduler.py --mode run
goto menu

:train_single
cls
echo.
set /p symbol="Enter symbol (e.g., BTCUSDT): "
set /p timeframe="Enter timeframe (e.g., 1h, 4h): "
echo.
echo 🧪 Training %symbol% %timeframe%...
echo.
python auto_trainer.py --mode symbol --symbol %symbol% --timeframe %timeframe% --verbose
echo.
pause
goto menu

:evaluate
cls
echo.
set /p symbol="Enter symbol (e.g., BTCUSDT): "
set /p timeframe="Enter timeframe (e.g., 1h): "
echo.
python continuous_learner.py --symbol %symbol% --timeframe %timeframe% --mode evaluate
echo.
pause
goto menu

:invalid
echo.
echo ❌ Invalid choice. Please enter 1-7
timeout /t 2 >nul
goto menu

:exit
cls
echo.
echo 👋 Goodbye!
echo.
timeout /t 2 >nul
exit
