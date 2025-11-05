from flask import Blueprint
from flask_smorest import abort
from src.metrics import track_request_metrics

# Create blueprint
api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Import and register sub-blueprints
from .health import health_bp
api_v1_bp.register_blueprint(health_bp)


@api_v1_bp.route('/info')
@track_request_metrics
def api_info():
    """API information endpoint."""
    return {
        "name": "DeepSeek OCR API",
        "version": "1.0.0",
        "description": "OCR processing API with Gitee AI integration"
    }
