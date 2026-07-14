@echo off
REM Run this script from the project folder to install dependencies and start the Vite dev server.
cd /d "%~dp0"
if not exist package.json (
  echo package.json not found in %~dp0
  exit /b 1
)
npm install
npm run dev
