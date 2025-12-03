=====================================
SQLBolt Offline - Quick Start Guide
=====================================

HOW TO RUN
----------

1. Open Terminal (Cmd+Space, type "Terminal")

2. Navigate to this folder:
   cd /Users/clayskaggs/Desktop/SQL_offline

3. Start the local server:
   python3 -m http.server 8080

4. Open your browser and go to:
   http://localhost:8080

5. Start learning SQL!


TO STOP THE SERVER
------------------
Press Ctrl+C in Terminal


WHY A SERVER IS NEEDED
----------------------
Browsers block WebAssembly (.wasm) files from loading
when you open HTML files directly (file://) for security.
The local server provides a proper http:// context.


TROUBLESHOOTING
---------------
- "Address already in use" error:
  Use a different port: python3 -m http.server 8888
  Then go to http://localhost:8888

- "python3 not found":
  Try: python -m http.server 8080

- Page shows "Loading...":
  Make sure all 3 files are in the same folder:
  - index.html
  - sql-wasm.js
  - sql-wasm.wasm


CONTENTS
--------
All 18 SQLBolt lessons with exact content from sqlbolt.com:
- Lessons 1-4: SELECT basics, WHERE constraints
- Lesson 5: Review with cities database
- Lessons 6-8: JOINs, OUTER JOINs, NULLs
- Lessons 9-12: Expressions, Aggregates, Query Order
- Lessons 13-15: INSERT, UPDATE, DELETE
- Lessons 16-18: CREATE, ALTER, DROP TABLE

Enjoy learning SQL offline!
