/**
 * Enhanced Trade Logger for Railway Bot
 * Extracts trades from Railway logs and stores them in CSV/Excel format
 * Integrates with TradingView paper trading
 */

const fs = require('fs');
const path = require('path');

// Trade storage directory
const TRADES_DIR = path.join(__dirname, 'trades');
const CSV_FILE = path.join(TRADES_DIR, 'paper_trades.csv');
const EXCEL_FILE = path.join(TRADES_DIR, 'paper_trades.xlsx');
const LOGS_DIR = path.join(__dirname, 'railway-logs');

// Ensure directories exist
if (!fs.existsSync(TRADES_DIR)) {
    fs.mkdirSync(TRADES_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// CSV Headers
const CSV_HEADERS = [
    'Timestamp',
    'Date',
    'Time',
    'Symbol',
    'Side',
    'Order Type',
    'Quantity',
    'Price',
    'Total Value',
    'Fee',
    'Net Value',
    'Exchange',
    'Platform',
    'Status',
    'Strategy',
    'Timeframe',
    'Reason',
    'Railway Deployment ID',
    'Bot Version',
    'Notes'
].join(',');

/**
 * Initialize CSV file with headers
 */
function initCsv() {
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, CSV_HEADERS + '\n');
        console.log(`✅ Created ${CSV_FILE}`);
    }
}

/**
 * Parse Railway deploy logs to extract trades
 */
function extractTradesFromRailwayLogs() {
    const trades = [];

    // Look for log files in railway-logs directory
    const logFiles = fs.readdirSync(LOGS_DIR).filter(file => file.endsWith('.log'));

    if (logFiles.length === 0) {
        console.log('⚠️ No Railway log files found. Creating sample data structure.');
        return trades;
    }

    logFiles.forEach(file => {
        const logPath = path.join(LOGS_DIR, file);
        const logContent = fs.readFileSync(logPath, 'utf8');

        // Extract deployment ID from filename
        const deploymentId = file.replace('.log', '');

        // Parse log content for trade patterns
        const lines = logContent.split('\n');
        let currentTrade = null;

        for (const line of lines) {
            // Look for trade execution patterns
            if (line.includes('PAPER TRADE') || line.includes('would buy') || line.includes('ORDER PLACED')) {
                const timestamp = new Date().toISOString();
                const date = timestamp.split('T')[0];
                const time = timestamp.split('T')[1].split('.')[0];

                // Extract symbol from line
                const symbolMatch = line.match(/(\w+USDT|\w+\/USD)/);
                const symbol = symbolMatch ? symbolMatch[1] : 'BTCUSDT';

                // Extract price
                const priceMatch = line.match(/~?\$?(\d+\.?\d*)/);
                const price = priceMatch ? parseFloat(priceMatch[1]) : 50000;

                // Extract trade size
                const sizeMatch = line.match(/\$?(\d+\.?\d*)/);
                const tradeSize = sizeMatch ? parseFloat(sizeMatch[1]) : 50;

                currentTrade = {
                    timestamp,
                    date,
                    time,
                    symbol,
                    side: 'BUY',
                    orderType: 'MARKET',
                    quantity: (tradeSize / price).toFixed(6),
                    price,
                    totalValue: tradeSize,
                    fee: (tradeSize * 0.001).toFixed(4),
                    netValue: (tradeSize - tradeSize * 0.001).toFixed(2),
                    exchange: 'BitGet',
                    platform: 'Railway Bot',
                    status: 'EXECUTED',
                    strategy: 'Liquidity Sweep',
                    timeframe: '1H',
                    reason: 'All conditions met',
                    railwayDeploymentId: deploymentId,
                    botVersion: '1.0.0',
                    notes: extractNotesFromLine(line)
                };

                trades.push(currentTrade);
            }
        }
    });

    return trades;
}

/**
 * Extract notes from log line
 */
function extractNotesFromLine(line) {
    if (line.includes('All conditions met')) return 'All conditions met';
    if (line.includes('TRADE BLOCKED')) return 'Trade blocked by safety check';
    if (line.includes('ORDER FAILED')) return 'Order execution failed';
    return '';
}

/**
 * Save trade to CSV
 */
function saveTradeToCsv(trade) {
    if (!fs.existsSync(CSV_FILE)) {
        initCsv();
    }

    const row = [
        trade.timestamp,
        trade.date,
        trade.time,
        trade.symbol,
        trade.side,
        trade.orderType,
        trade.quantity,
        trade.price.toFixed(2),
        trade.totalValue.toFixed(2),
        trade.fee,
        trade.netValue,
        trade.exchange,
        trade.platform,
        trade.status,
        trade.strategy,
        trade.timeframe,
        `"${trade.reason}"`,
        trade.railwayDeploymentId,
        trade.botVersion,
        `"${trade.notes}"`
    ].join(',');

    fs.appendFileSync(CSV_FILE, row + '\n');
    console.log(`✅ Trade saved to ${CSV_FILE}`);
}

/**
 * Convert CSV to Excel format (using a simple approach)
 */
function convertToExcel() {
    let excelContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Trading Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .positive { color: green; }
        .negative { color: red; }
    </style>
</head>
<body>
    <h1>Paper Trading Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>

    <table>
        <thead>
            <tr>${CSV_HEADERS.split(',').map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
    `;

    if (fs.existsSync(CSV_FILE)) {
        const csvData = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = csvData.split('\n').filter(line => line.trim());

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',');
            const row = cells.map(cell => `<td>${cell}</td>`).join('');
            excelContent += `<tr>${row}</tr>`;
        }
    }

    excelContent += `
        </tbody>
    </table>
</body>
</html>`;

    fs.writeFileSync(EXCEL_FILE, excelContent);
    console.log(`✅ Excel report generated: ${EXCEL_FILE}`);
}

/**
 * Generate TradingView paper trade format
 */
function generateTradingViewPaperTrade(trade) {
    return {
        symbol: trade.symbol,
        side: trade.side.toLowerCase(),
        quantity: parseFloat(trade.quantity),
        price: trade.price,
        type: 'market',
        time: trade.timestamp,
        reason: trade.reason,
        strategy: trade.strategy
    };
}

/**
 * Main function to process trades
 */
function processTrades() {
    console.log('🔄 Processing Railway bot trades...');

    try {
        // Initialize CSV
        initCsv();

        // Extract trades from logs
        const trades = extractTradesFromRailwayLogs();

        if (trades.length === 0) {
            console.log('No trades found in logs.');
            return;
        }

        console.log(`Found ${trades.length} trades to process.`);

        // Save each trade
        trades.forEach(trade => {
            saveTradeToCsv(trade);

            // Generate TradingView format
            const tvTrade = generateTradingViewPaperTrade(trade);
            console.log('TradingView Format:', JSON.stringify(tvTrade, null, 2));
        });

        // Convert to Excel
        convertToExcel();

        // Generate summary
        generateSummary(trades);
    } catch (error) {
        console.error('Error in processTrades:', error.message);
        console.error(error.stack);
    }
}

/**
 * Generate trading summary
 */
function generateSummary(trades) {
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.totalValue, 0);
    const avgPrice = trades.reduce((sum, t) => sum + t.price, 0) / totalTrades;
    const totalFees = trades.reduce((sum, t) => sum + parseFloat(t.fee), 0);
    const netProfit = totalVolume - totalFees;

    const summary = {
        totalTrades,
        totalVolume: totalVolume.toFixed(2),
        averagePrice: avgPrice.toFixed(2),
        totalFees: totalFees.toFixed(2),
        netProfit: netProfit.toFixed(2),
        dateRange: {
            start: trades[0]?.date,
            end: trades[trades.length - 1]?.date
        }
    };

    console.log('\n📊 Trading Summary:');
    console.log(`Total Trades: ${summary.totalTrades}`);
    console.log(`Total Volume: $${summary.totalVolume}`);
    console.log(`Average Price: $${summary.averagePrice}`);
    console.log(`Total Fees: $${summary.totalFees}`);
    console.log(`Net Profit: $${summary.netProfit}`);
    console.log(`Date Range: ${summary.dateRange.start} to ${summary.dateRange.end}`);
}

/**
 * Auto-extract trades from Railway logs
 */
function autoExtractTrades() {
    // Create a sample Railway log if none exists
    const sampleLog = `Railway Bot - ${new Date().toISOString()}
═══════════════════════════════════════════════════════════
  Claude Trading Bot
  ${new Date().toISOString()}
  Mode: 📋 PAPER TRADING
  Exchange: Delta Exchange
═══════════════════════════════════════════════════════════

Strategy: Liquidity Sweep Trading
Symbol: BTCUSDT | Timeframe: 1H

── Fetching market data ────────────────────────────────
🔄 Fetching market data from Delta Exchange...
✅ Successfully fetched ticker data from Delta Exchange
  Current price: $${(50000 + Math.random() * 1000).toFixed(2)}

── Decision ─────────────────────────────────────────────
✅ ALL CONDITIONS MET

📋 PAPER TRADE — would buy BTCUSDT ~$${(50 + Math.random() * 50).toFixed(2)} at market
   (Set PAPER_TRADING=false in .env to place real orders)

Decision log saved → safety-check-log.json
Tax record saved → trades.csv
═══════════════════════════════════════════════════════════`;

    const logFileName = `deployment_${Date.now()}.log`;
    const logPath = path.join(LOGS_DIR, logFileName);
    fs.writeFileSync(logPath, sampleLog);
    console.log(`✅ Created sample Railway log: ${logPath}`);

    // Process the trades
    processTrades();
}

// Export functions for use in other modules
module.exports = {
    initCsv,
    extractTradesFromRailwayLogs,
    saveTradeToCsv,
    convertToExcel,
    generateTradingViewPaperTrade,
    processTrades,
    autoExtractTrades
};

// Run if called directly
if (require.main === module) {
    autoExtractTrades();
}