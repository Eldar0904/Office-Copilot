@echo off
echo ================================
echo  Copilot Agent Server
echo ================================
echo.

echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install from nodejs.org
    pause
    exit /b 1
)

echo.
echo Moving to agent-server folder...
cd /d "%~dp0agent-server"
echo Current folder: %CD%
echo.

if not exist node_modules (
    echo Installing dependencies for the first time...
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. See above.
        pause
        exit /b 1
    )
)

echo.
echo Starting agent server...
node server.js

pause
