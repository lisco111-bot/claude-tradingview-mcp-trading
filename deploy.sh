#!/bin/bash

echo "=== Deploying to Railway ==="

# Check if we're in the right directory
if [ ! -f "bot.js" ]; then
    echo "Error: bot.js not found"
    exit 1
fi

# Commit any changes
git add .
git commit -m "Fix Railway deployment issues" || true

# Push to Railway
echo "Pushing to Railway..."
git push origin master || echo "Git push failed, Railway might be using a different method"

echo "=== Deployment complete ==="