#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "================================================================"
echo "   🚗 RIDERS LUXURY - Premium Ride Sharing App"
echo "================================================================"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed or not in PATH${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${BLUE}✓ Node.js version: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}✓ npm version: $(npm --version)${NC}"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}"
    echo "WARNING: .env file not found!"
    echo "Creating basic .env file..."
    echo -e "${NC}"
    
    cat > .env << EOL
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/riders-luxury

# JWT secret key
JWT_SECRET=riders-luxury-super-secret-jwt-key-2024

# Server port
PORT=5000

# Node environment
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000

# WhatsApp API (for future integration)
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_KEY=your-whatsapp-api-key
EOL
    
    echo -e "${GREEN}✓ Basic .env file created${NC}"
fi

echo ""
echo -e "${CYAN}📱 Features:${NC}"
echo -e "${GREEN}✓ Luxury glassmorphism design${NC}"
echo -e "${GREEN}✓ PWA ready (Add to Home Screen)${NC}"
echo -e "${GREEN}✓ User authentication system${NC}"
echo -e "${GREEN}✓ Ride booking and management${NC}"
echo -e "${GREEN}✓ WhatsApp location sharing${NC}"
echo -e "${GREEN}✓ Responsive mobile-first design${NC}"
echo ""
echo -e "${BLUE}🌐 Starting server on http://localhost:5000${NC}"
echo -e "${BLUE}📚 API documentation available at /api${NC}"
echo ""
echo -e "${PURPLE}================================================================${NC}"
echo ""

# Check if MongoDB is running (optional)
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✓ MongoDB is running${NC}"
    else
        echo -e "${YELLOW}⚠ MongoDB is not running. Please start MongoDB service.${NC}"
        echo -e "${BLUE}To start MongoDB: sudo systemctl start mongod${NC}"
        echo -e "${BLUE}Or use MongoDB Atlas cloud service${NC}"
    fi
fi

echo ""
echo -e "${CYAN}Starting Riders Luxury server...${NC}"

# Start the application
npm start

# If npm start fails, try node server/server.js
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}npm start failed, trying direct node execution...${NC}"
    node server/server.js
fi
