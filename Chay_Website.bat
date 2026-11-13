@echo off
title Bay Nui Eco-Homestay Server
color 0A
cd /d "%~dp0"

echo =======================================================
echo     HE THONG QUAN LY BAY NUI ECO-HOMESTAY
echo =======================================================
echo.

echo [1/4] Kiem tra Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo   [LOI] Khong tim thay Node.js.
    echo   Vui long cai dat Node.js 18+ tai https://nodejs.org roi chay lai file nay.
    echo.
    pause
    exit /b 1
)
node -v

echo.
echo [2/4] Kiem tra cong 3000...
netstat -ano | findstr /r /c:"LISTENING.*:3000 " >nul 2>nul
if not errorlevel 1 (
    echo   [CANH BAO] Cong 3000 dang bi mot chuong trinh khac chiem.
    echo   Dong chuong trinh do roi chay lai, hoac chay lenh sau de tim va tat:
    echo       netstat -ano ^| findstr :3000
    echo       taskkill /PID ^<so_PID^> /F
    echo.
    pause
    exit /b 1
)
echo   OK - cong 3000 dang trong.

echo.
echo [3/4] Cai dat thu vien (NPM)...
call npm install --silent

echo.
echo [4/4] Khoi dong Server...
echo   Trinh duyet se tu mo sau khi server san sang.
echo   Ghi chu: VUI LONG KHONG TAT CUA SO NAY TRONG LUC DUNG WEB!
echo =======================================================
echo.

REM Mo trinh duyet o tien trinh rieng, cho server len xong moi mo (tranh loi "khong the ket noi")
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

node server.js

echo.
echo Server da dung.
pause
