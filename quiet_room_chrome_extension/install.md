# Quick Installation Guide

## Step 1: Create Icons
1. Open `create_icons.html` in your browser
2. Right-click on each canvas and "Save image as":
   - Save the 16x16 canvas as `icons/icon16.png`
   - Save the 48x48 canvas as `icons/icon48.png`
   - Save the 128x128 canvas as `icons/icon128.png`

## Step 2: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome_extension` folder

## Step 3: Start Your App
1. Make sure your Drawing Inspiration app is running:
   ```bash
   npm start
   # or
   node server.js
   ```
2. Verify it's running on `http://127.0.0.1:8787`

## Step 4: Test the Extension
1. Click the extension icon in Chrome toolbar
2. Check if it shows "Connected to app"
3. Go to any website with images
4. Right-click on an image and select "Save to References"
5. Check your app's References tab to see the saved image

## Troubleshooting
- If connection fails, make sure your app is running on the correct port
- Check the browser console for any error messages
- Try the "Test Connection" button in the extension popup
