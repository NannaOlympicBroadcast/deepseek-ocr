# DeepSeek OCR Platform

A deployable OCR platform with Flask API backend and Next.js frontend, packaged via docker-compose with Postgres, Redis, and Prometheus monitoring.

## Architecture

- **Backend**: Flask API with SQLAlchemy, Redis, and Prometheus metrics
- **Frontend**: Next.js 14 with Tailwind CSS
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Monitoring**: Prometheus
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Make (optional, for convenient commands)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd deepseek-ocr

# Quick setup (creates .env and checks dependencies)
./setup.sh

# Or manually:
cp .env.example .env
```

### 2. Start Services

```bash
# Using Make (recommended)
make up

# Or using docker-compose directly
docker-compose up -d
```

### 3. Run Database Migrations

```bash
make migrate
```

### 4. Access Services

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/api-docs
- **Prometheus**: http://localhost:9090
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Development

### Environment Variables

Key environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `WEB_HOST`: Frontend URL for CORS
- `NEXT_PUBLIC_API_BASE`: API URL for frontend
- `METRICS_ENABLED`: Enable Prometheus metrics

### Useful Commands

```bash
# Build all services
make build

# View logs
make logs

# Access service shells
make api-shell    # Flask API
make web-shell    # Next.js
make db-shell     # PostgreSQL
make redis-shell  # Redis

# Run tests
make test

# Code formatting
make format

# Linting
make lint

# Create new database migration
make migration MSG="Add new feature"

# Stop services
make down

# Clean up everything
make clean
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/v1/health` - API health check
- `GET /api/v1/info` - API information
- `GET /metrics` - Prometheus metrics
- `GET /api-docs` - Swagger documentation

### Database Migrations

```bash
# Create new migration
make migration MSG="Create users table"

# Run migrations
make migrate

# Check migration status
docker-compose exec api alembic current
```

## Monitoring

Prometheus is configured to scrape metrics from the Flask API:

- **Prometheus UI**: http://localhost:9090
- **Metrics Endpoint**: http://localhost:8000/metrics

Available metrics:
- `flask_requests_total` - Request count by method, endpoint, and status
- `flask_request_duration_seconds` - Request duration histogram

## Project Structure

```
deepseek-ocr/
├── apps/
│   ├── api/                 # Flask API backend
│   │   ├── src/
│   │   │   ├── api/        # API blueprints
│   │   │   ├── db/         # Database models
│   │   │   ├── app.py      # Flask app factory
│   │   │   └── config.py   # Configuration
│   │   ├── migrations/     # Alembic migrations
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── web/                # Next.js frontend
│       ├── app/
│       ├── components/
│       ├── package.json
│       └── Dockerfile
├── infra/
│   └── docker/
│       └── prometheus/
│           └── prometheus.yml
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

## Production Deployment

For production deployment:

1. Update environment variables in `.env`
2. Set `FLASK_ENV=production` and `DEBUG=false`
3. Use production-ready secrets
4. Configure proper SSL/TLS termination
5. Set up proper backup strategies
6. Configure resource limits in docker-compose.yml

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License
