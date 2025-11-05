from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client.core import CollectorRegistry
from flask import Flask, Response
import time
from src.config import settings

# Custom registry
registry = CollectorRegistry()

# Metrics
REQUEST_COUNT = Counter(
    'flask_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

REQUEST_DURATION = Histogram(
    'flask_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)


def track_request_metrics(func):
    """Decorator to track request metrics."""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        # Get Flask app context from first argument if it's a method
        if args and hasattr(args[0], '__class__'):
            flask_app = args[0].app if hasattr(args[0], 'app') else None
        else:
            flask_app = None
            
        try:
            result = func(*args, **kwargs)
            status = 200
            return result
        except Exception as e:
            status = 500
            raise
        finally:
            duration = time.time() - start_time
            
            # Record metrics
            REQUEST_COUNT.labels(
                method='GET',  # Simplified for now
                endpoint=func.__name__,
                status=status
            ).inc()
            
            REQUEST_DURATION.labels(
                method='GET',  # Simplified for now
                endpoint=func.__name__
            ).observe(duration)
    
    return wrapper


def setup_metrics(app: Flask):
    """Setup Prometheus metrics endpoint."""
    
    @app.route('/metrics')
    def metrics():
        """Prometheus metrics endpoint."""
        if not settings.METRICS_ENABLED:
            return Response("Metrics disabled", status=404)
        return Response(generate_latest(registry), mimetype=CONTENT_TYPE_LATEST)
