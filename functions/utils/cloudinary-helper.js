const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a base64 image to Cloudinary
 * @param {string} base64String - Base64 string representation of image
 * @param {string} folder - Cloudinary folder to store image in
 * @returns {Promise<Object>} - Cloudinary upload result with image details
 */
async function uploadBase64Image(base64String, folder = 'appfoundry-screenshots') {
  try {
    // If the base64 string already includes data URI prefix, use it as is
    // Otherwise, add the prefix for image/png
    const dataUri = base64String.startsWith('data:') 
      ? base64String 
      : `data:image/png;base64,${base64String}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folder,
      resource_type: 'image',
      // Use a timestamp in the public ID to ensure uniqueness
      public_id: `submission-${Date.now()}`,
      // Add some tags for easier management
      tags: ['appfoundry', 'submission'],
    });
    
    // Return a simplified object with just the information we need
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
}

/**
 * Generate an optimized image URL from a Cloudinary public ID
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = null,
    height = null,
    crop = 'limit'
  } = options;
  
  // Build transformation string
  let transformations = ['f_auto', 'q_auto']; // Always use these for optimal delivery
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  
  const transformationString = transformations.join(',');
  
  return cloudinary.url(publicId, {
    transformation: transformationString
  });
}

/**
 * Upload multiple base64 images to Cloudinary
 * @param {Array<string>} base64Array - Array of base64 strings
 * @param {string} folder - Cloudinary folder to store images in
 * @returns {Promise<Array<Object>>} - Array of Cloudinary image objects
 */
async function uploadMultipleImages(base64Array, folder = 'appfoundry-screenshots') {
  if (!base64Array || !Array.isArray(base64Array) || base64Array.length === 0) {
    return [];
  }

  // Filter out empty or invalid entries
  const validImages = base64Array.filter(img => img && typeof img === 'string');
  
  if (validImages.length === 0) {
    return [];
  }

  try {
    // Process all uploads in parallel with Promise.all
    const uploadPromises = validImages.map(base64 => uploadBase64Image(base64, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
}

/**
 * Check if an image is already a Cloudinary URL or object
 * @param {string|Object} image - Image to check
 * @returns {boolean} - True if it's already a Cloudinary image
 */
function isCloudinaryImage(image) {
  if (typeof image === 'object' && image !== null) {
    return !!image.publicId && !!image.url;
  }
  
  if (typeof image === 'string') {
    return image.includes('res.cloudinary.com');
  }
  
  return false;
}

module.exports = {
  uploadBase64Image,
  uploadMultipleImages,
  getOptimizedImageUrl,
  isCloudinaryImage
};
