#!/usr/bin/env node

/**
 * Trade Management Script
 *
 * Usage:
 * - node manage-trades.js extract     # Extract trades from Railway logs
 * - node manage-trades.js sync        # Sync trades to TradingView
 * - node manage-trades.js excel       # Generate Excel report
 * - node manage-trades.js summary     # Show trading summary
 * - node manage-trades.js all         # Run all commands
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import modules
const tradeLogger = require('./trade-logger');
const { syncToTradingView } = require('./tradingview-integration');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Colored console log
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if Railway logs exist, create sample if needed
 */
function ensureRailwayLogs() {
    const logsDir = path.join(__dirname, 'railway-logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
    if (logFiles.length === 0) {
        log('⚠️ No Railway log files found. Creating sample data...', 'yellow');
        tradeLogger.autoExtractTrades();
    } else {
        log(`✅ Found ${logFiles.length} Railway log files`, 'green');
    }
}

/**
 * Extract trades from Railway logs
 */
async function extractTrades() {
    log('\n🔍 Extracting trades from Railway logs...', 'cyan');
    ensureRailwayLogs();

    try {
        const trades = tradeLogger.extractTradesFromRailwayLogs();
        if (trades.length > 0) {
            log(`✅ Found ${trades.length} trades to save`, 'green');
            trades.forEach(trade => {
                tradeLogger.saveTradeToCsv(trade);
            });
            log('✅ All trades saved to CSV', 'green');
        } else {
            log('ℹ️ No new trades found in logs', 'yellow');
        }
    } catch (error) {
        log(`❌ Error extracting trades: ${error.message}`, 'red');
    }
}

/**
 * Sync trades to TradingView
 */
async function syncToTrading() {
    log('\n🔄 Syncing trades to TradingView...', 'cyan');

    try {
        await syncToTradingView();
        log('✅ Sync completed successfully!', 'green');
    } catch (error) {
        log(`❌ Error syncing to TradingView: ${error.message}`, 'red');
    }
}

/**
 * Generate Excel report
 */
function generateExcel() {
    log('\n📊 Generating Excel report...', 'cyan');

    try {
        tradeLogger.convertToExcel();
        log('✅ Excel report generated successfully!', 'green');

        // Show file paths
        const csvPath = path.join(__dirname, 'trades', 'paper_trades.csv');
        const excelPath = path.join(__dirname, 'trades', 'paper_trades.xlsx');

        log(`\n📁 Files created:`, 'cyan');
        log(`   CSV: ${csvPath}`, 'yellow');
        log(`   Excel: ${excelPath}`, 'yellow');
    } catch (error) {
        log(`❌ Error generating Excel: ${error.message}`, 'red');
    }
}

/**
 * Show trading summary
 */
function showSummary() {
    log('\n📈 Trading Summary', 'cyan');

    try {
        const csvPath = path.join(__dirname, 'trades', 'paper_trades.csv');
        if (!fs.existsSync(csvPath)) {
            log('❌ No trades.csv found. Run extract first.', 'red');
            return;
        }

        const csvData = fs.readFileSync(csvPath, 'utf8');
        const lines = csvData.split('\n').filter(line => line.trim());

        if (lines.length <= 1) {
            log('ℹ️ No trades recorded yet', 'yellow');
            return;
        }

        // Calculate summary
        const trades = lines.slice(1).map(line => {
            const [timestamp, date, time, symbol, side, orderType, quantity, price, totalValue, fee, netValue, exchange, platform, status, strategy, timeframe, reason, railwayId, version, notes] = line.split(',');
            return {
                date,
                symbol,
                side,
                price: parseFloat(price),
                totalValue: parseFloat(totalValue),
                fee: parseFloat(fee),
                netValue: parseFloat(netValue),
                status,
                strategy
            };
        });

        const totalTrades = trades.length;
        const totalVolume = trades.reduce((sum, t) => sum + t.totalValue, 0);
        const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);
        const netProfit = totalVolume - totalFees;

        // Group by symbol
        const symbolStats = trades.reduce((acc, trade) => {
            if (!acc[trade.symbol]) {
                acc[trade.symbol] = {
                    count: 0,
                    volume: 0,
                    avgPrice: 0,
                    totalFees: 0
                };
            }
            acc[trade.symbol].count++;
            acc[trade.symbol].volume += trade.totalValue;
            acc[trade.symbol].avgPrice += trade.price;
            acc[trade.symbol].totalFees += trade.fee;
            return acc;
        }, {});

        // Display summary
        log(`\n📊 Overall Statistics:`, 'cyan');
        log(`   Total Trades: ${totalTrades}`, 'yellow');
        log(`   Total Volume: $${totalVolume.toFixed(2)}`, 'yellow');
        log(`   Total Fees: $${totalFees.toFixed(4)}`, 'yellow');
        log(`   Net Profit: $${netProfit.toFixed(2)} ${netProfit >= 0 ? '📈' : '📉'}`, netProfit >= 0 ? 'green' : 'red');

        log(`\n📊 Symbol Breakdown:`, 'cyan');
        Object.entries(symbolStats).forEach(([symbol, stats]) => {
            const avgPrice = stats.avgPrice / stats.count;
            log(`   ${symbol}:`, 'yellow');
            log(`     Trades: ${stats.count}`, 'green');
            log(`     Volume: $${stats.volume.toFixed(2)}`, 'green');
            log(`     Avg Price: $${avgPrice.toFixed(2)}`, 'green');
            log(`     Fees: $${stats.totalFees.toFixed(4)}`, 'green');
        });

        // Recent trades
        log(`\n📊 Recent Trades (last 5):`, 'cyan');
        const recentTrades = trades.slice(-5).reverse();
        recentTrades.forEach(trade => {
            log(`   ${trade.date} ${trade.symbol} ${trade.side} @ $${trade.price.toFixed(2)}`, 'cyan');
        });

    } catch (error) {
        log(`❌ Error generating summary: ${error.message}`, 'red');
    }
}

/**
 * Open trades in Excel
 */
function openInExcel() {
    log('\n📂 Opening trades in Excel...', 'cyan');

    try {
        const excelPath = path.join(__dirname, 'trades', 'paper_trades.xlsx');
        if (fs.existsSync(excelPath)) {
            // Try to open Excel
            if (process.platform === 'win32') {
                execSync(`start excel "${excelPath}"`);
            } else if (process.platform === 'darwin') {
                execSync(`open -a Microsoft\ Excel "${excelPath}"`);
            } else {
                execSync(`libreoffice --calc "${excelPath}"`);
            }
            log('✅ Excel opened successfully!', 'green');
        } else {
            log('❌ Excel file not found. Generate it first with: node manage-trades.js excel', 'red');
        }
    } catch (error) {
        log(`❌ Error opening Excel: ${error.message}`, 'red');
    }
}

/**
 * Clean up old files
 */
function cleanup() {
    log('\n🧹 Cleaning up old files...', 'cyan');

    try {
        const logsDir = path.join(__dirname, 'railway-logs');
        const tradesDir = path.join(__dirname, 'trades');

        // Clean railway logs older than 7 days
        const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        logFiles.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < sevenDaysAgo) {
                fs.unlinkSync(filePath);
                log(`   Deleted: ${file}`, 'yellow');
            }
        });

        log('✅ Cleanup completed!', 'green');
    } catch (error) {
        log(`❌ Error during cleanup: ${error.message}`, 'red');
    }
}

/**
 * Show help
 */
function showHelp() {
    log('\n📖 Trade Management Help', 'cyan');
    log('\nUsage: node manage-trades.js <command>', 'yellow');
    log('\nCommands:', 'cyan');
    log('  extract    - Extract trades from Railway logs and save to CSV', 'yellow');
    log('  sync       - Sync trades to TradingView paper trading', 'yellow');
    log('  excel      - Generate Excel report from CSV data', 'yellow');
    log('  summary    - Show detailed trading statistics', 'yellow');
    log('  open       - Open trades file in Excel', 'yellow');
    log('  cleanup    - Clean up old log files (older than 7 days)', 'yellow');
    log('  all        - Run all commands: extract → sync → excel', 'yellow');
    log('  help       - Show this help message', 'yellow');
    log('\nEnvironment Variables:', 'cyan');
    log('  TRADINGVIEW_API_KEY - Your TradingView API key (optional)', 'yellow');
    log('  SYMBOL - Trading symbol (default: BTCUSDT)', 'yellow');
    log('  TIMEFRAME - Timeframe (default: 1H)', 'yellow');
}

/**
 * Main function
 */
async function main() {
    const command = process.argv[2];

    // Show help if no command provided
    if (!command || command === 'help') {
        showHelp();
        return;
    }

    // Execute commands
    switch (command) {
        case 'extract':
            await extractTrades();
            break;
        case 'sync':
            await syncToTrading();
            break;
        case 'excel':
            generateExcel();
            break;
        case 'summary':
            showSummary();
            break;
        case 'open':
            openInExcel();
            break;
        case 'cleanup':
            cleanup();
            break;
        case 'all':
            log('\n🚀 Running all commands...', 'cyan');
            await extractTrades();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
            await syncToTrading();
            await new Promise(resolve => setTimeout(resolve, 1000));
            generateExcel();
            log('\n✅ All commands completed!', 'green');
            break;
        default:
            log(`\n❌ Unknown command: ${command}`, 'red');
            showHelp();
    }
}

// Run main function
main().catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
});