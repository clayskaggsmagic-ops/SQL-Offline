const http = require('http');

const data = JSON.stringify({
  problemText: "Two Sum",
  userCode: "def two_sum(nums, target): pass",
  expectedAnswer: "Return indices",
  errorMessage: "None"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/explain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => { resData += chunk; });
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Gemini Response:", resData.substring(0, 200) + "...");
  });
});

req.on('error', (e) => { console.error("Error:", e.message); });
req.write(data);
req.end();
