from flask import Flask
from flask_cors import CORS
from flask_smorest import Api
from src.config import settings
from src.metrics import setup_metrics
from src.db import engine, Base


def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__)
    
    # Configuration
    app.config['DEBUG'] = settings.DEBUG
    app.config['API_TITLE'] = 'DeepSeek OCR API'
    app.config['API_VERSION'] = 'v1'
    app.config['OPENAPI_VERSION'] = '3.0.2'
    app.config['OPENAPI_URL_PREFIX'] = '/api-docs'
    app.config['OPENAPI_SWAGGER_UI_PATH'] = '/swagger'
    app.config['OPENAPI_SWAGGER_UI_URL'] = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist/'
    
    # Initialize extensions
    CORS(app, origins=[settings.WEB_HOST])
    api = Api(app)
    
    # Setup metrics
    setup_metrics(app)
    
    # Register blueprints
    from src.api.v1 import api_v1_bp
    api.register_blueprint(api_v1_bp)
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host=settings.API_HOST, port=settings.API_PORT, debug=settings.DEBUG)
