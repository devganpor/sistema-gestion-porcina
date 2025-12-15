FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source
COPY server/ ./server/

# Expose port
EXPOSE 3001

# Start command
CMD ["sh", "-c", "cd server && npm run railway:start"]