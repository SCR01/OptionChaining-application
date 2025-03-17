@echo off
echo Starting Option Chain WebSocket Application...

echo Starting Backend Server...
start cmd /k "cd %~dp0backend && npm install && npm start"

echo Waiting for backend to initialize (5 seconds)...
timeout /t 5 /nobreak > nul

echo Starting Frontend Development Server...
start cmd /k "cd %~dp0frontend && npm install && npm start"

echo.
echo ====================================================
echo Application is starting! You can access it at:
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo ====================================================
