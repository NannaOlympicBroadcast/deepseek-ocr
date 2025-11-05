from flask import Blueprint
from flask_smorest import abort
from src.metrics import track_request_metrics

health_bp = Blueprint('health', __name__, url_prefix='/health')


@health_bp.route('/')
@track_request_metrics
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "DeepSeek OCR API is running"
    }
