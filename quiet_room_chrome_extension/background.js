// Background service worker for the Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item for images (primary method)
  chrome.contextMenus.create({
    id: "saveToReferences",
    title: "Save image to References",
    contexts: ["image"]
  });
  
  // Create context menu item for all elements EXCEPT images (fallback for complex structures)
  chrome.contextMenus.create({
    id: "saveToReferencesFallback",
    title: "Find references on the page",
    contexts: ["page", "selection", "link", "editable"]
  });
});

const DEFAULT_PORT = 8787;
const FALLBACK_PORTS = [8788, 8789, 8790, 8800, 8880];
const HOSTS = ["127.0.0.1", "localhost"];
const NOTIFY_ICON_URL = chrome.runtime.getURL('icon.svg');

function safeNotify(options) {
  chrome.notifications.create({
    ...options,
    iconUrl: NOTIFY_ICON_URL
  }, () => {
    void chrome.runtime.lastError;
  });
}

function getStoredApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiBaseUrl"], (result) => {
      resolve(result.apiBaseUrl || null);
    });
  });
}

function setStoredApiBaseUrl(apiBaseUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ apiBaseUrl }, () => resolve());
  });
}

async function pingBaseUrl(baseUrl, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response = await fetch(`${baseUrl}/api/ping`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      return true;
    }
    // Back-compat: older app builds don't have /api/ping yet.
    if (response.status === 404) {
      response = await fetch(`${baseUrl}/api/phone-info`, { signal: controller.signal });
      return response.ok;
    }
    return false;
  } catch {
    return false;
  }
}

async function detectApiBaseUrl() {
  // Prefer previously successful base URL.
  const stored = await getStoredApiBaseUrl();
  if (stored && await pingBaseUrl(stored)) {
    return stored;
  }

  const ports = [DEFAULT_PORT, ...FALLBACK_PORTS];
  for (const port of ports) {
    for (const host of HOSTS) {
      const baseUrl = `http://${host}:${port}`;
      if (await pingBaseUrl(baseUrl)) {
        await setStoredApiBaseUrl(baseUrl);
        return baseUrl;
      }
    }
  }
  return null;
}

async function getApiBaseUrl() {
  return detectApiBaseUrl();
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToReferences") {
    // For image context, we have the image URL directly - save immediately
    if (info.srcUrl) {
      // Send message to content script to get image data
      chrome.tabs.sendMessage(tab.id, {
        action: "getImageData",
        imageUrl: info.srcUrl
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Content script not available:", chrome.runtime.lastError.message);
          // Try to inject content script and retry
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            // Retry after a short delay
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: "getImageData",
                imageUrl: info.srcUrl
              }, (retryResponse) => {
                if (retryResponse && retryResponse.success) {
                  saveImageToReferences(retryResponse.imageData, retryResponse.filename, tab.id, info.srcUrl);
                } else {
                  console.error("Failed to get image data after retry:", retryResponse?.error);
                  safeNotify({
                    type: 'basic',
                    title: '❌ Save Failed',
                    message: 'Cannot access image on this page. Try a different image.'
                  });
                  
                  // Show visual feedback on the image
                  if (tab.id && info.srcUrl) {
                    chrome.tabs.sendMessage(tab.id, {
                      action: "showSaveFeedback",
                      imageUrl: info.srcUrl,
                      success: false
                    });
                  }
                }
              });
            }, 100);
          });
        } else if (response && response.success) {
          saveImageToReferences(response.imageData, response.filename, tab.id, info.srcUrl);
        } else {
          console.error("Failed to get image data:", response?.error);
          safeNotify({
            type: 'basic',
            title: '❌ Save Failed',
            message: 'Failed to process image. Try a different image.'
          });
          
          // Show visual feedback on the image
          if (tab.id && info.srcUrl) {
            chrome.tabs.sendMessage(tab.id, {
              action: "showSaveFeedback",
              imageUrl: info.srcUrl,
              success: false
            });
          }
        }
      });
    }
  } else if (info.menuItemId === "saveToReferencesFallback") {
    // For fallback context, show the image selector directly
    showImageSelector(tab.id);
  }
});

// Helper function to show image selector
function showImageSelector(tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: "showImageSelector"
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Content script not available:", chrome.runtime.lastError.message);
      // Try to inject content script and retry
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        // Retry after a short delay
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: "showImageSelector"
          }, (retryResponse) => {
            if (!retryResponse || !retryResponse.success) {
              console.error("Failed to show image selector:", retryResponse?.error);
              safeNotify({
                type: 'basic',
                title: '❌ Save Failed',
                message: 'Cannot access image on this page. Try a different image.'
              });
            }
          });
        }, 100);
      });
    } else if (!response || !response.success) {
      console.error("Failed to show image selector:", response?.error);
      safeNotify({
        type: 'basic',
        title: '❌ Save Failed',
        message: 'Failed to process image. Try a different image.'
      });
    }
  });
}

// Function to save image to references
async function saveImageToReferences(imageData, filename, tabId, imageUrl) {
  try {
    // Validate image data before processing
    if (!imageData || !imageData.startsWith('data:image/')) {
      throw new Error('Invalid image data format');
    }
    
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Validate blob size (should be > 0)
    if (blob.size === 0) {
      throw new Error('Image data is empty or corrupted');
    }
    
    // Validate blob type
    if (!blob.type.startsWith('image/')) {
      throw new Error('Invalid image type');
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('image', blob, filename);
    
    // Send to your app's API
    const baseUrl = await getApiBaseUrl();
    if (!baseUrl) {
      throw new Error('APP_NOT_RUNNING');
    }
    const apiResponse = await fetch(`${baseUrl}/api/references`, {
      method: 'POST',
      body: formData
    });
    
    if (apiResponse.ok) {
      const result = await apiResponse.json();
      console.log('Image saved successfully:', result);
      
      // Show success notification
      safeNotify({
        type: 'basic',
        title: '🎨 Image Saved!',
        message: 'Successfully saved to References'
      });
      
      // Show visual feedback on the image (only if we have tabId and imageUrl)
      if (tabId && imageUrl) {
        chrome.tabs.sendMessage(tabId, {
          action: "showSaveFeedback",
          imageUrl: imageUrl,
          success: true
        });
      }
    } else {
      throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
    }
  } catch (error) {
    console.error('Error saving image:', error);
    if (error.message === 'APP_NOT_RUNNING') {
      safeNotify({
        type: 'basic',
        title: '❌ Save Failed',
        message: 'Cannot connect to the app. Make sure it is running and try again.'
      });
      return;
    }
    
    // If the image data is invalid, corrupted, or we can't access it, try to download the original URL
    if (imageUrl && (
      error.message.includes('Failed to fetch') || 
      error.message.includes('Invalid image data') ||
      error.message.includes('Image data is empty') ||
      error.message.includes('Invalid image type') ||
      error.message.includes('Opaque response') ||
      error.message.includes('All image download methods failed')
    )) {
      console.log('Attempting to download original image URL...', imageUrl);
      try {
        // Try to download the image directly using chrome.downloads
        const downloadId = await chrome.downloads.download({
          url: imageUrl,
          filename: filename,
          saveAs: false
        });
        
        console.log('Download ID:', downloadId);
        
        if (downloadId) {
          safeNotify({
            type: 'basic',
            title: '📥 Image Downloaded!',
            message: 'Image downloaded to your Downloads folder'
          });
          
          // Show visual feedback on the image
          if (tabId && imageUrl) {
            chrome.tabs.sendMessage(tabId, {
              action: "showSaveFeedback",
              imageUrl: imageUrl,
              success: true
            });
          }
          return; // Exit early since we handled it with download
        } else {
          console.error('Download failed - no download ID returned');
        }
      } catch (downloadError) {
        console.error('Download fallback also failed:', downloadError);
        console.error('Download error details:', {
          message: downloadError.message,
          stack: downloadError.stack,
          url: imageUrl,
          filename: filename
        });
      }
    }
    
    // Show user-friendly error notification
    safeNotify({
      type: 'basic',
      title: '❌ Save Failed',
      message: 'Save failed, try to get the image manually'
    });
    
    // Show visual feedback on the image (only if we have tabId and imageUrl)
    if (tabId && imageUrl) {
      chrome.tabs.sendMessage(tabId, {
        action: "showSaveFeedback",
        imageUrl: imageUrl,
        success: false
      });
    }
  }
}

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "testConnection") {
    testConnection().then(sendResponse);
    return true; // Keep the message channel open for async response
  } else if (request.action === "saveImageDirect") {
    // For direct saves, we don't have tabId and imageUrl, so we'll skip visual feedback
    saveImageToReferences(request.imageData, request.filename, null, null);
    sendResponse({success: true});
  } else if (request.action === "saveSelectedImage") {
    // Save the image selected by the user
    saveImageToReferences(request.imageData, request.filename, sender.tab.id, request.imageUrl);
    sendResponse({success: true});
  }
});

// Test connection to the app
async function testConnection() {
  try {
    const baseUrl = await getApiBaseUrl();
    if (!baseUrl) {
      return { success: false, message: "Cannot connect to app. Make sure it's running." };
    }
    return { success: true, message: `Connected to app successfully (${baseUrl})` };
  } catch (error) {
    return { success: false, message: "Cannot connect to app. Make sure it's running." };
  }
}

// Listen for download events to track progress and catch failures
chrome.downloads.onChanged.addListener((downloadDelta) => {
  console.log('Download state changed:', downloadDelta);
  
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('Download completed successfully:', downloadDelta.id);
  } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
    console.error('Download interrupted:', downloadDelta.id, downloadDelta.error);
  }
});

chrome.downloads.onErased.addListener((downloadId) => {
  console.log('Download erased:', downloadId);
});
