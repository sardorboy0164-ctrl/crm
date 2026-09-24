#!/bin/bash
# Linux/macOS uchun ishga tushirish skripti (start.bat ning Linux versiyasi)
set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "  EDUCATION CRM - ishga tushirish"
echo "=========================================="

echo "[1/3] Backend (Django) : http://localhost:8000"
(cd backend && python3 manage.py migrate --noinput) || true
(cd backend && exec python3 manage.py runserver 8000) &
BACK_PID=$!

echo "[2/3] Frontend (Vite)  : http://localhost:5173"
(cd frontend && exec npm run dev) &
FRONT_PID=$!

echo "[3/3] Tayyor! Backend: http://localhost:8000/admin/ | Frontend: http://localhost:5173"
echo "To'xtatish: Ctrl+C"
trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT INT TERM
wait
