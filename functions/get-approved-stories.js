// functions/get-approved-stories.js

// Sample data for development (used when no database is available)
const sampleStories = [
  {
    id: '1',
    name: 'Sarah Johnson',
    appName: 'SleepTrack',
    appType: 'Health & Fitness',
    testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
    images: ['https://placeholder.pics/svg/300x200'],
    date: '2025-04-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Michael Chen',
    appName: 'RecipeKeeper',
    appType: 'Lifestyle',
    testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
    images: ['https://placeholder.pics/svg/300x200'],
    date: '2025-04-22T14:45:00Z'
  }
];

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // For now, return sample data
    // In a production app, you would query a database for approved stories
    
    // Return only the fields needed for public display (no email, full story, etc.)
    const publicStories = sampleStories.map(story => ({
      id: story.id,
      name: story.name,
      appName: story.appName,
      appType: story.appType,
      testimonial: story.testimonial,
      images: story.images || [],
      date: story.date
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(publicStories)
    };
  } catch (error) {
    console.error('Error fetching approved stories:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch approved stories' })
    };
  }
};
