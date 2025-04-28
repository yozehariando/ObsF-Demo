# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all app files
COPY . .

# Build the production app
RUN npm run build

# Stage 2: Run
FROM node:20-slim

WORKDIR /app

# Only copy necessary files from builder
COPY --from=builder /app ./

# Install only production dependencies
RUN npm install --production

# Expose port (Observable Framework runs on 3000)
EXPOSE 3000

# Run in production mode
CMD ["npm", "start"]
