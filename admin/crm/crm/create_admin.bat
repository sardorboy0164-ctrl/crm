@echo off
echo ==========================================
echo   ADMIN yaratish
echo ==========================================
echo.
cd backend
python -c "import django; django.setup(); from accounts.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@education.uz', 'admin123', role='admin'); print('Admin yaratildi: admin / admin123')"
echo.
pause
