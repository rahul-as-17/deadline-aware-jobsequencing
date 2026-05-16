@echo off
echo ============================================================
echo   DAA-EL -- Intelligent Job Scheduling System
echo ============================================================
echo.

:: Start FastAPI backend in a new window
echo [1/2] Starting FastAPI backend on port 8000...
start "DAA-EL Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

:: Give backend 3 seconds to start
timeout /t 3 /nobreak >nul

:: Start frontend dev server in a new window
echo [2/2] Starting React frontend on port 5173...
start "DAA-EL Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

:: Give frontend 2 seconds to start
timeout /t 2 /nobreak >nul

:: Open browser
echo.
echo Opening http://localhost:5173 ...
start "" http://localhost:5173

echo.
echo Both servers are running.
echo   Backend API : http://localhost:8000
echo   Frontend UI : http://localhost:5173
echo   API Docs    : http://localhost:8000/docs
echo.
echo Close the two terminal windows to stop the servers.
pause
