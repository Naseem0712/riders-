@echo off
echo.
echo ================================================================
echo   🚗 RIDERS LUXURY - Setup Script for Windows
echo ================================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo.
    echo 📥 Please download and install Node.js:
    echo    1. Go to: https://nodejs.org/
    echo    2. Download the LTS version
    echo    3. Install with default settings
    echo    4. Restart your computer
    echo    5. Run this script again
    echo.
    echo Opening Node.js download page...
    start https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

echo ✅ npm version: 
npm --version

echo.
echo 📦 Installing project dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 🌐 Creating basic .env file...

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo MONGODB_URI=mongodb://localhost:27017/riders-luxury > .env
    echo JWT_SECRET=riders-luxury-super-secret-jwt-key-2024 >> .env
    echo PORT=5000 >> .env
    echo NODE_ENV=development >> .env
    echo FRONTEND_URL=http://localhost:5000 >> .env
    echo ✅ .env file created
)

echo.
echo ================================================================
echo   🎉 Ready to Start!
echo ================================================================
echo.
echo To start the app, run: npm start
echo Or double-click: start.bat
echo.
echo The app will be available at: http://localhost:5000
echo.
pause
