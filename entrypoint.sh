#!/bin/sh

# Wait for environment variables to be available
sleep 2

# Check if .env exists and has the required credentials
if [ ! -f .env ]; then
    echo "No .env file found"
    exit 1
fi

# Check for required credentials
if grep -q "DELTAEXCHANGE_API_KEY=" .env && grep -q "DELTAEXCHANGE_SECRET_KEY=" .env && grep -q "DELTAEXCHANGE_PASSPHRASE=" .env; then
    echo "All required credentials found"
    # Start the bot
    exec node bot.js
else
    echo "Missing credentials in .env: DELTAEXCHANGE_API_KEY, DELTAEXCHANGE_SECRET_KEY, DELTAEXCHANGE_PASSPHRASE"
    exit 1
fi