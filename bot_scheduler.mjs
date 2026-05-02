// ICT Trading Bot Scheduler
console.log('🤖 ICT Trading Bot Scheduler');
console.log('First run in 30 minutes, then every hour');
console.log('Press Ctrl+C to stop\n');

import { exec } from 'child_process';

// Wait 30 minutes then run every hour
setTimeout(() => {
    console.log('\n🎯 Running bot now...\n');

    const runBot = () => {
        console.log('🚀 Running ICT Trading Bot...');
        exec('node bot.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error: ${error.message}`);
                return;
            }

            console.log('✅ Bot completed');
            console.log('Next run in 1 hour...\n');

            // Schedule next run in 1 hour
            setTimeout(runBot, 60 * 60 * 1000);
        });
    };

    // First run
    runBot();
}, 30 * 60 * 1000);