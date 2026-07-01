// Test script to verify /api/lead endpoint works
// Usage: node test-lead.js [url]
// Example: node test-lead.js https://ally-messi-quiz-production.up.railway.app

const url = process.argv[2] || 'http://localhost:3000';

const testLead = {
  contact: 'test@example.com',
  contact_type: 'email',
  goal: 'job',
  industry: 'tech',
  club: 'boca',
  behavior: 'warm',
  dream: 'messi',
  degree_estimate: 5,
  referral_code: 'ABOFRC'
};

console.log(`\n🧪 Testing lead submission to: ${url}/api/lead\n`);

fetch(`${url}/api/lead`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testLead)
})
  .then(res => {
    console.log(`📊 Response status: ${res.status} ${res.statusText}`);
    return res.json().then(data => ({ status: res.status, data }));
  })
  .then(({ status, data }) => {
    if (status === 200 || status === 201) {
      console.log('✅ SUCCESS - Lead saved!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ FAILED');
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  })
  .catch(err => {
    console.log('❌ REQUEST FAILED');
    console.log('Error:', err.message);
    console.log('\nPossible issues:');
    console.log('- Server not running');
    console.log('- CORS error (check browser console)');
    console.log('- Wrong URL');
  });
