import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """Custom exception handler for API"""
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    logger.error(f"Exception occurred: {exc}", exc_info=True)
    
    # If the default handler didn't work, create a custom response
    if response is None:
        return Response({
            'error': 'Internal server error',
            'detail': str(exc) if str(exc) else 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Add custom error structure
    if 'detail' in response.data:
        response.data = {
            'error': response.data['detail'],
            'detail': response.data['detail']
        }
    
    return response