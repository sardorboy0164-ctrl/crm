@echo off
echo ==========================================
echo   MANGA CRM - Ta'lim Platformasi
echo ==========================================
echo.

echo [1] Backend (Django) ishga tushirilmoqda...
start "Manga CRM Backend" cmd /c "cd backend && python manage.py runserver 8000"

timeout /t 2 /nobreak >nul

echo [2] Frontend (Vite) ishga tushirilmoqda...
start "Manga CRM Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ==========================================
echo   Manga CRM muvaffaqiyatli ishga tushdi!
echo   Backend:  http://localhost:8000/admin/
echo   Frontend: http://localhost:5173
echo ==========================================
echo.
pause
