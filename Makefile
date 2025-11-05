.PHONY: help build up down logs clean test lint format

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build all services"
	@echo "  up        - Start all services"
	@echo "  down      - Stop all services"
	@echo "  logs      - Show logs for all services"
	@echo "  clean     - Remove containers, volumes, and images"
	@echo "  test      - Run tests"
	@echo "  lint      - Run linting"
	@echo "  format    - Format code"
	@echo "  migrate   - Run database migrations"

# Build all services
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Clean up everything
clean:
	docker-compose down -v --rmi all

# Run migrations
migrate:
	docker-compose exec api alembic upgrade head

# Create new migration
migration:
	@if [ -z "$(MSG)" ]; then echo "Usage: make migration MSG='description'"; exit 1; fi
	docker-compose exec api alembic revision --autogenerate -m "$(MSG)"

# API development commands
api-shell:
	docker-compose exec api bash

api-logs:
	docker-compose logs -f api

# Web development commands
web-shell:
	docker-compose exec web sh

web-logs:
	docker-compose logs -f web

# Database commands
db-shell:
	docker-compose exec postgres psql -U postgres -d deepseek_ocr

db-logs:
	docker-compose logs -f postgres

# Redis commands
redis-shell:
	docker-compose exec redis redis-cli

# Test commands
test-api:
	docker-compose exec api python -m pytest

test-web:
	docker-compose exec web npm test

test: test-api test-web

# Linting
lint-api:
	docker-compose exec api flake8 src/
	docker-compose exec api black --check src/
	docker-compose exec api isort --check-only src/

lint-web:
	docker-compose exec web npm run lint

lint: lint-api lint-web

# Formatting
format-api:
	docker-compose exec api black src/
	docker-compose exec api isort src/

format-web:
	docker-compose exec web npm run lint:fix

format: format-api format-web
