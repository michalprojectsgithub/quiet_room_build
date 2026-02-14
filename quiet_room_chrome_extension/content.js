// Content script that runs on web pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getImageData") {
    getImageData(request.imageUrl).then(sendResponse);
    return true; // Keep the message channel open for async response
  } else if (request.action === "showImageSelector") {
    showImageSelector().then(sendResponse);
    return true; // Keep the message channel open for async response
  } else if (request.action === "showSaveFeedback") {
    showSaveFeedback(request.imageUrl, request.success);
  }
});

function normalizeUrl(url) {
  if (!url) return null;
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return null;
  }
}

function parseSrcset(srcset) {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map(part => part.trim())
    .map(part => {
      const [url, descriptor] = part.split(/\s+/);
      if (!url) return null;
      let score = 0;
      if (descriptor) {
        if (descriptor.endsWith('w')) {
          score = parseFloat(descriptor);
        } else if (descriptor.endsWith('x')) {
          score = parseFloat(descriptor) * 1000;
        }
      }
      return { url, score };
    })
    .filter(Boolean);
}

function pickBestSrcsetUrl(srcset) {
  const candidates = parseSrcset(srcset);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  return candidates[0].url || null;
}

function getDataUrl(img, key) {
  const value = img?.dataset ? img.dataset[key] : null;
  return value || null;
}

function getPreferredImgUrl(img) {
  if (!img) return null;

  const dataPriority = [
    'full',
    'hires',
    'original',
    'large',
    'srcset',
    'lazySrc',
    'src'
  ];

  for (const key of dataPriority) {
    if (key === 'srcset') {
      const dataSrcset = getDataUrl(img, 'srcset');
      const bestDataSrcset = pickBestSrcsetUrl(dataSrcset);
      if (bestDataSrcset) return bestDataSrcset;
      continue;
    }
    const dataUrl = getDataUrl(img, key);
    if (dataUrl) return dataUrl;
  }

  const bestSrcset = pickBestSrcsetUrl(img.srcset);
  if (bestSrcset) return bestSrcset;

  if (img.currentSrc) return img.currentSrc;
  if (img.src) return img.src;
  return null;
}

function matchesImageUrl(img, targetUrl) {
  if (!img || !targetUrl) return false;
  const normalizedTarget = normalizeUrl(targetUrl);
  if (!normalizedTarget) return false;

  const candidates = [
    img.src,
    img.currentSrc,
    getDataUrl(img, 'full'),
    getDataUrl(img, 'hires'),
    getDataUrl(img, 'original'),
    getDataUrl(img, 'large'),
    getDataUrl(img, 'src'),
    getDataUrl(img, 'lazySrc'),
    pickBestSrcsetUrl(img.srcset),
    pickBestSrcsetUrl(getDataUrl(img, 'srcset'))
  ].filter(Boolean);

  return candidates.some(candidate => normalizeUrl(candidate) === normalizedTarget);
}

function resolveBestImageUrl(imageUrl) {
  const images = document.querySelectorAll('img');
  const matchingImg = Array.from(images).find(img => matchesImageUrl(img, imageUrl));
  if (!matchingImg) return imageUrl;
  return getPreferredImgUrl(matchingImg) || imageUrl;
}

// Show visual feedback when image is being saved
function showSaveFeedback(imageUrl, success) {
  // Find the image element
  const images = document.querySelectorAll('img');
  const targetImage = Array.from(images).find(img => matchesImageUrl(img, imageUrl));
  
  if (!targetImage) return;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${success ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    border-radius: 4px;
    z-index: 10000;
    transition: opacity 0.3s ease;
  `;
  
  overlay.innerHTML = success ? '✅ Saved!' : '❌ Save failed, try to get the image manually';
  
  // Position overlay relative to image
  const rect = targetImage.getBoundingClientRect();
  overlay.style.position = 'fixed';
  overlay.style.top = rect.top + 'px';
  overlay.style.left = rect.left + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  
  document.body.appendChild(overlay);
  
  // Remove overlay after 2 seconds
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }, 2000);
}

 // Function to get image data from URL
async function getImageData(imageUrl) {
   try {
     // Try multiple methods to get the image
     let imageData = null;
     let filename = 'image.jpg';

    const bestImageUrl = resolveBestImageUrl(imageUrl);
     
     // Generate filename from URL first
    try {
      const url = new URL(bestImageUrl);
       const pathname = url.pathname;
       const extractedFilename = pathname.split('/').pop();
       if (extractedFilename && extractedFilename.includes('.')) {
         filename = extractedFilename;
       }
     } catch (urlError) {
       filename = 'image.jpg';
     }
     
     // Method 1: Try regular fetch first
    try {
      const response = await fetch(bestImageUrl, {
         cache: 'no-cache',
         credentials: 'omit'
       });
       
       if (response.ok) {
         const blob = await response.blob();
         const reader = new FileReader();
         imageData = await new Promise((resolve, reject) => {
           reader.onload = () => resolve(reader.result);
           reader.onerror = reject;
           reader.readAsDataURL(blob);
         });
       } else {
         throw new Error(`HTTP ${response.status}`);
       }
     } catch (fetchError) {
       console.log('Fetch failed, trying canvas method...');
       
       // Method 2: Try canvas with crossOrigin
       try {
         imageData = await new Promise((resolve, reject) => {
           const img = new Image();
           img.crossOrigin = 'anonymous';
           
           img.onload = () => {
             try {
               const canvas = document.createElement('canvas');
               canvas.width = img.naturalWidth;
               canvas.height = img.naturalHeight;
               const ctx = canvas.getContext('2d');
               ctx.drawImage(img, 0, 0);
               resolve(canvas.toDataURL('image/jpeg', 0.9));
             } catch (canvasError) {
               reject(canvasError);
             }
           };
           
           img.onerror = () => {
             reject(new Error('Image failed to load with crossOrigin'));
           };
           
           // Add timeout
           setTimeout(() => reject(new Error('Image load timeout')), 10000);
           
          img.src = bestImageUrl;
         });
       } catch (canvasError) {
         console.log('Canvas with crossOrigin failed, trying without...');
         
         // Method 3: Try canvas without crossOrigin
         try {
           imageData = await new Promise((resolve, reject) => {
             const img = new Image();
             
             img.onload = () => {
               try {
                 const canvas = document.createElement('canvas');
                 canvas.width = img.naturalWidth;
                 canvas.height = img.naturalHeight;
                 const ctx = canvas.getContext('2d');
                 ctx.drawImage(img, 0, 0);
                 resolve(canvas.toDataURL('image/jpeg', 0.9));
               } catch (canvasError) {
                 reject(canvasError);
               }
             };
             
             img.onerror = () => {
               reject(new Error('Image failed to load without crossOrigin'));
             };
             
             // Add timeout
             setTimeout(() => reject(new Error('Image load timeout')), 10000);
             
            img.src = bestImageUrl;
           });
         } catch (finalError) {
           console.log('All methods failed, trying fetch with no-cors...');
           
                       // Method 4: Try fetch with no-cors as last resort
            try {
             const response = await fetch(bestImageUrl, {
                mode: 'no-cors',
                cache: 'no-cache'
              });
              
              if (response.type === 'opaque') {
                // For opaque responses, we can't access the data directly
                // Skip this method and let the background script handle it with downloads API
                throw new Error('Opaque response - cannot access image data');
              } else {
                const blob = await response.blob();
                const reader = new FileReader();
                imageData = await new Promise((resolve, reject) => {
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            } catch (noCorsError) {
              throw new Error('All image download methods failed');
            }
         }
       }
     }
     
     if (!imageData) {
       throw new Error('Failed to get image data from all methods');
     }
     
     return {
       success: true,
       imageData: imageData,
       filename: filename
     };
     } catch (error) {
    console.error('Error getting image data:', error);
    console.error('Image URL that failed:', imageUrl);
    console.error('Best image URL attempt:', resolveBestImageUrl(imageUrl));
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      success: false,
      error: error.message
    };
  }
 }

// Function to find all images on the page
function findAllImages() {
  const images = [];
  
  // 1. Standard img tags
  const imgTags = document.querySelectorAll('img');
  imgTags.forEach(img => {
    const bestUrl = getPreferredImgUrl(img);
    if (bestUrl && bestUrl.startsWith('http')) {
      const rect = img.getBoundingClientRect();
      // Only include images that are visible and have reasonable size
      if (rect.width > 50 && rect.height > 50 && rect.top >= 0 && rect.left >= 0) {
        images.push({
          url: bestUrl,
          element: img,
          type: 'img',
          rect: rect
        });
      }
    }
  });
  
  // 2. CSS background images
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const backgroundImage = style.backgroundImage;
    
    if (backgroundImage && backgroundImage !== 'none') {
      // Extract URL from background-image: url('...')
      const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch && urlMatch[1].startsWith('http')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50 && rect.top >= 0 && rect.left >= 0) {
          images.push({
            url: urlMatch[1],
            element: el,
            type: 'background',
            rect: rect
          });
        }
      }
    }
  });
  
  return images;
}



// Function to show image selector overlay
async function showImageSelector() {
  try {
    // Find all images on the page
    const images = findAllImages();
    
    if (images.length === 0) {
      return { success: false, error: "No images found on this page" };
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'image-selector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    `;
    
         // Create modal content
     const modal = document.createElement('div');
     modal.style.cssText = `
       background: white;
       border-radius: 12px;
       padding: 20px;
       max-width: 95vw;
       width: 1200px;
       max-height: 90vh;
       overflow-y: auto;
       box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
     `;
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Select an image to save';
    title.style.cssText = `
      margin: 0;
      color: #333;
      font-size: 18px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      padding: 5px;
      border-radius: 4px;
    `;
    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    
         // Add images grid
     const grid = document.createElement('div');
     grid.style.cssText = `
       display: grid;
       grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
       gap: 20px;
       max-height: 60vh;
       overflow-y: auto;
     `;
    
    // Add each image as a selectable option
    images.forEach((imageInfo, index) => {
      const imageCard = document.createElement('div');
      imageCard.style.cssText = `
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      `;
      
      imageCard.onmouseenter = () => {
        imageCard.style.borderColor = '#007bff';
        imageCard.style.transform = 'translateY(-2px)';
      };
      
      imageCard.onmouseleave = () => {
        imageCard.style.borderColor = '#ddd';
        imageCard.style.transform = 'translateY(0)';
      };
      
      imageCard.onclick = async () => {
        // Show loading state
        imageCard.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';
        
        // Get image data
        const imageData = await getImageData(imageInfo.url);
        if (imageData.success) {
          // Send to background script to save
          chrome.runtime.sendMessage({
            action: "saveSelectedImage",
            imageData: imageData.imageData,
            filename: imageData.filename,
            imageUrl: imageInfo.url
          });
          
          // Close overlay
          document.body.removeChild(overlay);
        } else {
          // Show error
          imageCard.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Failed to load image</div>';
        }
      };
      
             // Create image preview
       const img = document.createElement('img');
       img.src = imageInfo.url;
       img.style.cssText = `
         width: 100%;
         height: 200px;
         object-fit: cover;
         border-radius: 4px;
         margin-bottom: 8px;
       `;
      
      // Create image info
      const info = document.createElement('div');
      info.style.cssText = `
        font-size: 12px;
        color: #666;
        text-align: center;
      `;
      
      const size = Math.round(imageInfo.rect.width) + ' × ' + Math.round(imageInfo.rect.height);
      const type = imageInfo.type === 'background' ? 'Background' : 'Image';
      info.textContent = `${type} • ${size}`;
      
      imageCard.appendChild(img);
      imageCard.appendChild(info);
      grid.appendChild(imageCard);
    });
    
    modal.appendChild(grid);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close overlay when clicking outside
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
    
    // Close overlay with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    return { success: true, message: `Found ${images.length} images` };
  } catch (error) {
    console.error('Error showing image selector:', error);
    return { success: false, error: error.message };
  }
}

// Add visual feedback when hovering over images
document.addEventListener('mouseover', (event) => {
  if (event.target.tagName === 'IMG') {
    event.target.style.cursor = 'pointer';
    event.target.title = 'Right-click to save to References';
  }
});

// Optional: Add click handler for direct saving (alternative to right-click)
document.addEventListener('click', (event) => {
  if (event.target.tagName === 'IMG' && event.ctrlKey) {
    // Ctrl+click to save image
    event.preventDefault();
    getImageData(event.target.src).then((result) => {
      if (result.success) {
        chrome.runtime.sendMessage({
          action: "saveImageDirect",
          imageData: result.imageData,
          filename: result.filename
        });
      }
    });
  }
});
