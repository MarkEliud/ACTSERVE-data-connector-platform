# scripts/setup.sh
#!/bin/bash

# Frontend Setup Script
echo "Setting up Data Connector Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.9+"
    exit 1
fi

# Frontend setup
echo "Setting up frontend..."
cd frontend
cp .env.example .env.local
npm install
cd ..

# Backend setup
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..

# Docker setup (optional)
if command -v docker &> /dev/null; then
    echo "Docker detected. Starting services..."
    docker-compose up -d postgres
fi

echo "Setup completed!"
echo ""
echo "To start development:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend: cd backend && source venv/bin/activate && python manage.py runserver"
echo ""
echo "Default admin credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123"