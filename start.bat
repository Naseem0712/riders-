@echo off
echo Starting Riders Luxury App...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running (optional check)
echo Checking system requirements...

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please create a .env file with the following content:
    echo.
    echo MONGODB_URI=mongodb://localhost:27017/riders-luxury
    echo JWT_SECRET=riders-luxury-super-secret-jwt-key-2024
    echo PORT=5000
    echo NODE_ENV=development
    echo FRONTEND_URL=http://localhost:5000
    echo.
    echo Creating basic .env file...
    echo MONGODB_URI=mongodb://localhost:27017/riders-luxury > .env
    echo JWT_SECRET=riders-luxury-super-secret-jwt-key-2024 >> .env
    echo PORT=5000 >> .env
    echo NODE_ENV=development >> .env
    echo FRONTEND_URL=http://localhost:5000 >> .env
    echo.
    echo Basic .env file created!
)

echo.
echo ================================================================
echo   🚗 RIDERS LUXURY - Premium Ride Sharing App
echo ================================================================
echo.
echo   📱 Features:
echo   ✓ Luxury glassmorphism design
echo   ✓ PWA ready (Add to Home Screen)
echo   ✓ User authentication system
echo   ✓ Ride booking and management
echo   ✓ WhatsApp location sharing
echo   ✓ Responsive mobile-first design
echo.
echo   🌐 Starting server on http://localhost:5000
echo   📚 API documentation available at /api
echo.
echo ================================================================
echo.

REM Start the application
echo Starting Riders Luxury server...
npm start

REM If npm start fails, try node server/server.js
if %errorlevel% neq 0 (
    echo.
    echo npm start failed, trying direct node execution...
    node server/server.js
)

pause
