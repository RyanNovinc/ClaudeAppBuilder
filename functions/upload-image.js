// functions/upload-image.js
const { NetlifyKV } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  
  try {
    // Parse multipart form data
    const formData = parseMultipartForm(event); // You'd need a helper for this
    const { file, fileName } = formData;
    
    if (!file || !fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file provided' })
      };
    }
    
    // Store in Netlify Blobs
    const store = new NetlifyKV({ name: 'story-images' });
    const uniqueFileName = `${Date.now()}-${fileName}`;
    await store.set(uniqueFileName, file, {
      contentType: file.type || 'image/jpeg'
    });
    
    // Get the public URL
    const imageUrl = `/.netlify/blobs/story-images/${uniqueFileName}`;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl
      })
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred while uploading the image' })
    };
  }
};
