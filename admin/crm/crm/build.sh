#!/bin/bash

# Exit on error
set -e

echo "=========================================="
echo "  EDUCATION CRM - Build Script"
echo "=========================================="

# Install Python dependencies
echo "[1/5] Installing Python dependencies..."
pip install -r backend/requirements.txt

# Install Node.js dependencies and build frontend
echo "[2/5] Installing Node.js dependencies..."
cd frontend
npm install

echo "[3/5] Building React frontend..."
npm run build

echo "[4/5] Copying frontend build to Django..."
mkdir -p ../backend/frontend_build
cp -r dist/* ../backend/frontend_build/
cd ..

# Run Django migrations
echo "[5/5] Running Django migrations..."
cd backend
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if not exists
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'education_crm.settings')
django.setup()
from accounts.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@education.uz', 'admin123', role='admin')
    print('Superuser created: admin / admin123')
else:
    print('Superuser already exists')
"

# Seed test data
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'education_crm.settings')
django.setup()
from accounts.models import User
if User.objects.count() <= 1:
    exec(open('../seed_data.py').read().replace('import os', 'pass # import os'))
    print('Test data seeded')
else:
    print('Data already exists, skipping seed')
" || echo "Seed skipped"

echo "=========================================="
echo "  Build complete!"
echo "=========================================="
