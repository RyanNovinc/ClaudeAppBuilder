// functions/get-submissions.js
const { getSubmissions } = require('./utils/kv-store');

exports.handler = async function(event, context) {
  // Basic auth check - in production use JWTs or better auth
  if (!event.headers.authorization || event.headers.authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const submissions = await getSubmissions();
    return {
      statusCode: 200,
      body: JSON.stringify(submissions)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
