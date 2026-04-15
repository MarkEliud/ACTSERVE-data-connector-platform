# Makefile
.PHONY: help setup dev build test lint format clean docker-up docker-down docker-build

help:
	@echo "Available commands:"
	@echo "  make setup        - Initialize project (install deps, setup env)"
	@echo "  make dev          - Start development servers"
	@echo "  make build        - Build production assets"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run linters"
	@echo "  make format       - Format code"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make docker-build - Build Docker images"

setup:
	@echo "Setting up project..."
	@cd backend && python -m venv venv
	@cd backend && source venv/bin/activate && pip install -r requirements.txt
	@cd frontend && npm install
	@cp backend/.env.example backend/.env
	@cp frontend/.env.example frontend/.env.local
	@echo "Setup complete! Run 'make dev' to start development servers."

dev:
	@echo "Starting development servers..."
	@cd backend && source venv/bin/activate && python manage.py runserver &
	@cd frontend && npm run dev &
	@wait

build:
	@echo "Building production assets..."
	@cd frontend && npm run build
	@cd backend && source venv/bin/activate && python manage.py collectstatic --noinput

test:
	@echo "Running tests..."
	@cd backend && source venv/bin/activate && python manage.py test
	@cd frontend && npm run test
	@cd frontend && npm run lint
	@cd frontend && npm run type-check

lint:
	@echo "Running linters..."
	@cd backend && source venv/bin/activate && flake8 .
	@cd frontend && npm run lint

format:
	@echo "Formatting code..."
	@cd backend && source venv/bin/activate && black .
	@cd frontend && npm run format

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf backend/__pycache__
	@rm -rf backend/*/__pycache__
	@rm -rf frontend/.next
	@rm -rf frontend/node_modules
	@rm -rf frontend/out

docker-up:
	@echo "Starting Docker containers..."
	@docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose down

docker-build:
	@echo "Building Docker images..."
	@docker-compose build