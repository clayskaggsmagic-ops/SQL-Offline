const fetch = require('node-fetch');

async function test() {
  const res = await fetch("http://localhost:3000/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem: "Select All Movies",
      description: "Write a query to select all columns from the `movies` table.",
      code: "SELEC * FROM movies;",
      error: "near \"SELEC\": syntax error"
    })
  });
  const data = await res.json();
  console.log(data);
}
test();
