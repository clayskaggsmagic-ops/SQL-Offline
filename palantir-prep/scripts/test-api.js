const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/curriculum',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Curriculum Response:", data.substring(0, 100) + "...");
  });
});
req.on('error', (e) => { console.error("Error:", e.message); });
req.end();
