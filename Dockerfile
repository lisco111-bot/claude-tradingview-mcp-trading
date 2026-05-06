# Use the official Node.js runtime
FROM node:18-alpine

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

# Use a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

# Start the application
CMD ["node", "bot.js"]