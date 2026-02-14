@echo off
echo Installing Tauri dependencies for Drawing Inspiration App...
echo.

echo Checking if Rust is installed...
rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Rust is not installed. Please install Rust from https://rustup.rs/
    echo After installing Rust, run this script again.
    pause
    exit /b 1
)

echo Rust is installed.
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is installed.
echo.

echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo Failed to install Node.js dependencies.
    pause
    exit /b 1
)

echo.
echo Installing Tauri CLI globally...
npm install -g @tauri-apps/cli
if %errorlevel% neq 0 (
    echo Failed to install Tauri CLI.
    pause
    exit /b 1
)

echo.
echo Building Rust dependencies...
cd src-tauri
cargo build
if %errorlevel% neq 0 (
    echo Failed to build Rust dependencies.
    pause
    exit /b 1
)
cd ..

echo.
echo Installation complete!
echo.
echo To run the app in development mode:
echo   npm run tauri:dev
echo.
echo To build the app for production:
echo   npm run tauri:build
echo.
pause
