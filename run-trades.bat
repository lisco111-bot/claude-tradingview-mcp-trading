@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    Railway Bot Trade Management
echo ========================================
echo.
echo Choose an option:
echo.
echo [1] Extract trades from Railway logs
echo [2] Show trading summary
echo [3] Generate Excel report
echo [4] Sync to TradingView
echo [5] Open trades in Excel
echo [6] Run all commands (extract → sync → excel)
echo [7] Clean up old files
echo [8] Show help
echo [9] Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto extract
if "%choice%"=="2" goto summary
if "%choice%"=="3" goto excel
if "%choice%"=="4" goto sync
if "%choice%"=="5" goto open
if "%choice%"=="6" goto all
if "%choice%"=="7" goto cleanup
if "%choice%"=="8" goto help
if "%choice%"=="9" goto exit
goto invalid

:extract
echo.
echo 🔍 Extracting trades from Railway logs...
node manage-trades.js extract
pause
goto menu

:summary
echo.
echo 📈 Showing trading summary...
node manage-trades.js summary
pause
goto menu

:excel
echo.
echo 📊 Generating Excel report...
node manage-trades.js excel
echo.
echo ✅ Excel report generated!
pause
goto menu

:sync
echo.
echo 🔄 Syncing trades to TradingView...
node manage-trades.js sync
pause
goto menu

:open
echo.
echo 📂 Opening trades in Excel...
node manage-trades.js open
pause
goto menu

:cleanup
echo.
echo 🧹 Cleaning up old files...
node manage-trades.js cleanup
pause
goto menu

:all
echo.
echo 🚀 Running all commands...
node manage-trades.js all
pause
goto menu

:help
echo.
echo 📖 Help:
echo.
echo - Extract: Parses Railway logs and saves trades to CSV
echo - Summary: Shows trading statistics
echo - Excel: Generates HTML Excel report
echo - Sync: Syncs trades to TradingView (mock mode)
echo - Open: Opens trades file in Excel
echo - Cleanup: Removes log files older than 7 days
echo.
pause
goto menu

:invalid
echo.
echo ❌ Invalid choice. Please try again.
pause
goto menu

:menu
cls
echo.
echo ========================================
echo    Railway Bot Trade Management
echo ========================================
echo.
echo Choose an option:
echo.
echo [1] Extract trades from Railway logs
echo [2] Show trading summary
echo [3] Generate Excel report
echo [4] Sync to TradingView
echo [5] Open trades in Excel
echo [6] Run all commands (extract → sync → excel)
echo [7] Clean up old files
echo [8] Show help
echo [9] Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto extract
if "%choice%"=="2" goto summary
if "%choice%"=="3" goto excel
if "%choice%"=="4" goto sync
if "%choice%"=="5" goto open
if "%choice%"=="6" goto all
if "%choice%"=="7" goto cleanup
if "%choice%"=="8" goto help
if "%choice%"=="9" goto exit
goto invalid

:exit
echo.
echo 👋 Goodbye!
echo.