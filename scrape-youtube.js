const Apify = require('apify');
const axios = require('axios');

// Initialize Apify with your API key
Apify.main(async () => {
    const input = {
        urls: ['https://www.youtube.com/@InnerCircleTrader'],
        maxResults: 100,
        sortBy: 'date',
    };

    // Run the YouTube scraper
    const run = await Apify.callApiActor('streamers/youtube-transcript-scraper', input);

    // Extract transcripts
    const transcripts = [];
    for (const item of run.items) {
        if (item.transcripts && item.transcripts.length > 0) {
            transcripts.push({
                title: item.title,
                url: item.url,
                transcript: item.transcripts.join('\n\n')
            });
        }
    }

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('inner-circle-trader-transcripts.json', JSON.stringify(transcripts, null, 2));

    console.log(`Scraped ${transcripts.length} videos from InnerCircleTrader`);
});