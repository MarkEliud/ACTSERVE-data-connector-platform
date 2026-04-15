import logging

logger = logging.getLogger(__name__)

class AuditMiddleware:
    """Middleware to audit user actions"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log request
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            logger.info(f"User {request.user.email} accessed {request.path}")
        
        response = self.get_response(request)
        
        # Log response status
        if response.status_code >= 400:
            logger.warning(f"Error {response.status_code} for {request.path}")
        
        return response