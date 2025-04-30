// functions/utils/kv-store.js
const { NetlifyKV } = require('@netlify/blobs');

async function storeSubmission(submission) {
  const store = new NetlifyKV({ name: 'success-stories' });
  await store.set(`submission-${submission.id}`, JSON.stringify(submission));
  return submission.id;
}

async function getSubmissions() {
  const store = new NetlifyKV({ name: 'success-stories' });
  const keys = await store.list();
  const submissions = [];
  
  for (const key of keys) {
    if (key.startsWith('submission-')) {
      const data = await store.get(key);
      submissions.push(JSON.parse(data));
    }
  }
  
  return submissions;
}

async function updateSubmissionStatus(id, status) {
  const store = new NetlifyKV({ name: 'success-stories' });
  const key = `submission-${id}`;
  const data = await store.get(key);
  
  if (!data) return null;
  
  const submission = JSON.parse(data);
  submission.status = status;
  await store.set(key, JSON.stringify(submission));
  
  return submission;
}

module.exports = {
  storeSubmission,
  getSubmissions,
  updateSubmissionStatus
};
