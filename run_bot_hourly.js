#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Configuration
const RUN_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const LOG_FILE = 'bot_runs.log';

// Function to log bot runs
function logRun(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    // Append to log file
    fs.appendFileSync(LOG_FILE, logEntry);

    // Also log to console
    console.log(logEntry);
}

// Function to run the bot
function runBot() {
    console.log('\n🚀 Running ICT Trading Bot...');
    logRun('Starting bot run');

    exec('node bot.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Bot error: ${error.message}`);
            logRun(`ERROR: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`⚠️ Bot stderr: ${stderr}`);
            logRun(`STDERR: ${stderr}`);
        }

        console.log('✅ Bot run completed');
        logRun('Bot run completed successfully');

        // Log summary if available
        const lines = stdout.split('\n');
        const decisionLine = lines.find(line => line.includes('Decision'));
        if (decisionLine) {
            logRun(`DECISION: ${decisionLine}`);
        }
    });
}

// Initial run in 30 minutes
const initialDelay = 30 * 60 * 1000; // 30 minutes

console.log(`🤖 ICT Trading Bot Scheduler`);
console.log(`First run in: ${initialDelay / 60000} minutes`);
console.log(`Then every: ${RUN_INTERVAL / 60000} minutes`);
console.log(`Press Ctrl+C to stop\n`);

// Set initial timeout
setTimeout(() => {
    console.log('🎯 Initial run starting...\n');
    runBot();

    // Set up recurring runs
    setInterval(runBot, RUN_INTERVAL);
}, initialDelay);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⏹️ Stopping bot scheduler...');
    logRun('Scheduler stopped by user');
    process.exit(0);
});