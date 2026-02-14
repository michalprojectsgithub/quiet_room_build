#!/bin/bash

echo "Installing Tauri dependencies for Drawing Inspiration App..."
echo

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Rust is not installed. Please install Rust from https://rustup.rs/"
    echo "After installing Rust, run this script again."
    exit 1
fi

echo "Rust is installed."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js is installed."
echo

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install Node.js dependencies."
    exit 1
fi

echo
echo "Installing Tauri CLI globally..."
npm install -g @tauri-apps/cli
if [ $? -ne 0 ]; then
    echo "Failed to install Tauri CLI."
    exit 1
fi

echo
echo "Building Rust dependencies..."
cd src-tauri
cargo build
if [ $? -ne 0 ]; then
    echo "Failed to build Rust dependencies."
    exit 1
fi
cd ..

echo
echo "Installation complete!"
echo
echo "To run the app in development mode:"
echo "  npm run tauri:dev"
echo
echo "To build the app for production:"
echo "  npm run tauri:build"
echo
