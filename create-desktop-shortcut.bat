@echo off
REM This creates a desktop shortcut that runs the app from this folder.
setlocal enableextensions enabledelayedexpansion
set "APPDIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Belle Cosmetiques.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $s = (New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'cmd.exe'; $s.Arguments = '/c "cd /d "%APPDIR%" && npm run dev"'; $s.WorkingDirectory = '%APPDIR%'; $s.IconLocation = '%APPDIR%favicon.ico'; $s.Description = 'Belle Cosmetiques local app'; $s.Save() }"
echo Desktop shortcut created: %SHORTCUT%
endlocal
