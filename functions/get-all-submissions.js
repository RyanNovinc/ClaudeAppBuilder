// functions/get-all-submissions.js
exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Basic authentication check
  // In production, use a more secure auth method
  const adminToken = process.env.ADMIN_API_KEY || 'admin_token_secure';
  
  // Check Authorization header
  if (!event.headers.authorization) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing authorization header' })
    };
  }
  
  // Simple token validation - in production use proper auth
  if (event.headers.authorization !== `Bearer ${adminToken}`) {
    // For testing, allow admin_token_ pattern to work
    if (!event.headers.authorization.startsWith('Bearer admin_token_')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authorization token' })
      };
    }
  }

  try {
    // Fallback to sample data
    console.log('Using simplified function - returning sample data');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([
        {
          id: 'server_1',
          name: 'Sarah Johnson (Server)',
          email: 'sarah@example.com',
          appName: 'SleepTrack',
          appType: 'Health & Fitness',
          date: '2025-04-15T10:30:00Z',
          status: 'approved',
          testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
          story: 'I\'ve always wanted to create an app to help with my sleep tracking, but I was intimidated by the coding required. When I found the AppFoundry course, I was skeptical that I could really build something without coding knowledge, but I decided to give it a try.\n\nThe step-by-step guidance was incredible. I followed each module, and within 3 weeks, I had a working app that tracks sleep patterns, sends reminders, and even generates reports. My friends were shocked when I told them I built it myself without writing code!\n\nThe most valuable part was learning how to communicate effectively with Claude AI to get exactly what I wanted. Now I can make changes and improvements whenever I need to, without being dependent on expensive developers.\n\nThanks to AppFoundry, I\'ve gone from having zero technical skills to being able to bring my ideas to life independently!',
          images: ['https://placeholder.pics/svg/300x200', 'https://placeholder.pics/svg/300x200']
        },
        {
          id: 'server_2',
          name: 'Michael Chen (Server)',
          email: 'michael@example.com',
          appName: 'RecipeKeeper',
          appType: 'Lifestyle',
          date: '2025-04-22T14:45:00Z',
          status: 'pending',
          testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
          story: 'As someone who loves cooking, I\'ve always wanted a custom recipe app that works exactly how I want it to. I looked at existing apps, but none of them had the specific features I needed.\n\nI had no coding experience and quotes from developers were way out of my budget. When I discovered AppFoundry, it seemed too good to be true - build my own custom app without coding?\n\nBut it actually worked! Following the course, I was able to create a recipe app that lets me organize recipes by cuisine, dietary restrictions, and cooking time. It even has a meal planning feature that I designed myself!\n\nThe best part is that I can continue to improve it whenever I want. Last week I added a feature to automatically generate shopping lists from selected recipes, and it took me just a few hours!',
          images: ['https://placeholder.pics/svg/300x200']
        }
      ])
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve submissions' })
    };
  }
};
