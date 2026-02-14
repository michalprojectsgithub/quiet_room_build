start cmd /k "node server.js"
timeout /t 2 /nobreak >nul
start cmd /k "npm run dev"
start "" "http://localhost:5173"
