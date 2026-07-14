@echo off
REM Launch the local cosmetics app in a new terminal and open the browser at localhost:5175.
cd /d "%~dp0"
start "" cmd /k "cd /d "%~dp0" && npm run dev"
start "" "http://localhost:5175"

