import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with one of the existing images
const imagePath = path.join(__dirname, 'moodboards', '1756376682363', '1756376700427-985696410.jpg');

try {
  console.log('Testing sharp with image:', imagePath);
  const metadata = await sharp(imagePath).metadata();
  console.log('Image metadata:', metadata);
  
  if (metadata.width && metadata.height) {
    const aspectRatio = metadata.width / metadata.height;
    console.log('Aspect ratio:', aspectRatio);
    
    const maxDimension = 400;
    let imageWidth, imageHeight;
    
    if (aspectRatio >= 1) {
      // Landscape or square image
      imageWidth = Math.min(maxDimension, 300 * aspectRatio);
      imageHeight = imageWidth / aspectRatio;
    } else {
      // Portrait image
      imageHeight = Math.min(maxDimension, 300 / aspectRatio);
      imageWidth = imageHeight * aspectRatio;
    }
    
    // Round to nearest 10 for cleaner numbers
    imageWidth = Math.round(imageWidth / 10) * 10;
    imageHeight = Math.round(imageHeight / 10) * 10;
    
    console.log('Calculated dimensions:', { width: imageWidth, height: imageHeight });
  }
} catch (error) {
  console.error('Error testing sharp:', error);
}

