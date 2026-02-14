# Drawing Inspiration Saver - Chrome Extension

A Chrome extension that allows you to save images from any website directly to your Drawing Inspiration app's References tab.

## Features

- Right-click on any image to save it to References
- Visual feedback when hovering over images
- Connection status indicator
- Automatic image downloading and uploading
- Support for all image formats (JPG, PNG, WebP, etc.)

## Installation

1. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome_extension` folder

2. **Start your Drawing Inspiration app:**
   - Make sure your app is running on `http://127.0.0.1:8787`
   - The extension will automatically connect to your app

## Usage

### Method 1: Right-click (Recommended)
1. Navigate to any website with images
2. Right-click on an image you want to save
3. Select "Save to References" from the context menu
4. The image will be automatically saved to your References tab

### Method 2: Ctrl+Click (Alternative)
1. Hold Ctrl and click on any image
2. The image will be saved directly to References

### Check Connection Status
- Click the extension icon in your Chrome toolbar
- The popup will show if you're connected to your app
- Use the "Test Connection" button to verify connectivity

## How it Works

1. **Image Detection:** The extension detects when you right-click on an image
2. **Data Extraction:** It downloads the image and converts it to the proper format
3. **API Communication:** Sends the image to your app's `/api/references` endpoint
4. **Storage:** The image is saved to your `references` directory and added to `references.json`
5. **Feedback:** Shows a notification when the image is successfully saved

## Troubleshooting

### Extension not working?
- Make sure your Drawing Inspiration app is running on `http://127.0.0.1:8787`
- Check the connection status in the extension popup
- Try the "Test Connection" button

### Images not saving?
- Check if the image URL is accessible (some sites block direct image access)
- Verify your app's API is working by visiting `http://127.0.0.1:8787/api/ping`
- Check the browser console for error messages

### Permission issues?
- Make sure the extension has permission to access the website
- Some sites may block content scripts for security reasons

## Technical Details

- **Manifest Version:** 3 (latest Chrome extension standard)
- **Permissions:** contextMenus, activeTab, storage, notifications
- **Host Permissions:** http://127.0.0.1:8787/* (your app's API)
- **Content Scripts:** Runs on all websites to detect images
- **Background Script:** Handles context menus and API communication

## Files Structure

```
chrome_extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menus
├── content.js            # Content script for image detection
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── icons/                # Extension icons (16x16, 48x48, 128x128)
└── README.md             # This file
```

## Development

To modify the extension:
1. Edit the files in the `chrome_extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test the changes

## API Endpoints Used

- `GET /api/ping` - Connection test
- `POST /api/references` - Save image to references

The extension automatically handles image format conversion and file naming.
