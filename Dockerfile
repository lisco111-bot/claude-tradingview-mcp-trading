# Use the official Node.js runtime
FROM node:18-alpine

# Install cron
RUN apk add --no-cache dcron

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create a directory for secrets
RUN mkdir -p /run/secrets

# Expose port if needed
EXPOSE 3000

# Create cron job file (as root)
RUN echo "*/5 * * * * cd /app && node start-bot.js" | crontab -

# Use a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

# Start cron and keep container running
CMD ["dcron", "-f"]