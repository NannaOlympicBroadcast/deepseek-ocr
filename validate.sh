#!/bin/bash

echo "🔍 Validating DeepSeek OCR Monorepo Structure..."
echo

# Check if required directories exist
echo "📁 Checking directory structure..."
required_dirs=(
    "apps/api/src"
    "apps/api/src/api/v1"
    "apps/api/src/db/models"
    "apps/api/migrations"
    "apps/web/app"
    "apps/web/app/components"
    "infra/docker/prometheus"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir missing"
    fi
done

echo
echo "📄 Checking key files..."

# Check if key files exist
key_files=(
    "docker-compose.yml"
    ".env.example"
    "Makefile"
    "README.md"
    "apps/api/requirements.txt"
    "apps/api/src/app.py"
    "apps/api/src/config.py"
    "apps/api/Dockerfile"
    "apps/web/package.json"
    "apps/web/next.config.js"
    "apps/web/Dockerfile"
    "apps/api/migrations/versions/001_create_system_settings.py"
    "infra/docker/prometheus/prometheus.yml"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo
echo "🐍 Checking Python API structure..."
if [ -f "apps/api/src/app.py" ]; then
    echo "✅ Flask app factory exists"
    if grep -q "create_app" apps/api/src/app.py; then
        echo "✅ create_app function found"
    else
        echo "❌ create_app function missing"
    fi
fi

echo
echo "⚛️  Checking Next.js structure..."
if [ -f "apps/web/app/page.tsx" ]; then
    echo "✅ Next.js homepage exists"
fi
if [ -f "apps/web/app/health/page.tsx" ]; then
    echo "✅ Next.js health page exists"
fi

echo
echo "🗄️  Checking database setup..."
if [ -f "apps/api/migrations/versions/001_create_system_settings.py" ]; then
    echo "✅ Initial migration exists"
fi

echo
echo "📊 Checking monitoring setup..."
if [ -f "infra/docker/prometheus/prometheus.yml" ]; then
    echo "✅ Prometheus config exists"
    if grep -q "api:8000" infra/docker/prometheus/prometheus.yml; then
        echo "✅ Prometheus configured to scrape API"
    else
        echo "❌ Prometheus not configured for API"
    fi
fi

echo
echo "🐳 Checking Docker setup..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ Docker Compose file exists"
    services=("api" "web" "postgres" "redis" "prometheus")
    for service in "${services[@]}"; do
        if grep -q "$service:" docker-compose.yml; then
            echo "✅ $service service defined"
        else
            echo "❌ $service service missing"
        fi
    done
fi

echo
echo "📚 Checking documentation..."
if [ -f "README.md" ]; then
    echo "✅ README exists"
    if grep -q "Quick Start" README.md; then
        echo "✅ Quick start section found"
    fi
fi

echo
echo "🎯 Validation complete!"
