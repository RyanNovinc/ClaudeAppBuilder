// functions/get-approved-stories.js
const { getSubmissions } = require('./utils/kv-store');

exports.handler = async function(event, context) {
  try {
    const submissions = await getSubmissions();
    const approvedStories = submissions.filter(s => s.status === 'approved')
      .map(story => ({
        id: story.id,
        name: story.name,
        appName: story.appName,
        appType: story.appType,
        testimonial: story.testimonial,
        images: story.images,
        date: story.date
      })); // Only send necessary fields, omit email, full story, etc.
    
    return {
      statusCode: 200,
      body: JSON.stringify(approvedStories)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
