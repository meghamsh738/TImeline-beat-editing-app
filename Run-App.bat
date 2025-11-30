@echo off
setlocal
for /f "usebackq tokens=* delims=" %%i in (`wsl wslpath "%~dp0"`) do set WSL_DIR=%%i
wsl -e bash -lc "fuser -k 4178/tcp" >nul 2>&1
wsl -e bash -lc "cd '%WSL_DIR%web' && npm run dev -- --host --port 4178"
timeout /t 4 >nul
start "" http://localhost:4178
endlocal
