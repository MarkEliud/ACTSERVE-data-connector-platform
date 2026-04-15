import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_database_type(value):
    """Validate database type is supported"""
    allowed_types = ['postgresql', 'mysql', 'mongodb', 'clickhouse']
    if value not in allowed_types:
        raise ValidationError(
            _(f'Database type must be one of: {", ".join(allowed_types)}')
        )

def validate_port_number(value):
    """Validate port number is in valid range"""
    if value < 1 or value > 65535:
        raise ValidationError(_('Port must be between 1 and 65535'))

def validate_host(value):
    """Validate host format (hostname or IP)"""
    # Simple validation - can be enhanced with regex
    if not value or len(value) > 255:
        raise ValidationError(_('Invalid host format'))
    
    # Check for valid characters
    if not re.match(r'^[a-zA-Z0-9.-]+$', value):
        raise ValidationError(_('Host contains invalid characters'))

def validate_batch_size(value):
    """Validate batch size is within acceptable range"""
    if value < 1:
        raise ValidationError(_('Batch size must be at least 1'))
    if value > 100000:
        raise ValidationError(_('Batch size cannot exceed 100,000'))

def validate_file_format(value):
    """Validate file format is supported"""
    allowed_formats = ['json', 'csv']
    if value not in allowed_formats:
        raise ValidationError(
            _(f'File format must be one of: {", ".join(allowed_formats)}')
        )

def validate_email_list(value):
    """Validate list of email addresses"""
    if not isinstance(value, list):
        raise ValidationError(_('Value must be a list'))
    
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    for email in value:
        if not re.match(email_regex, email):
            raise ValidationError(_(f'Invalid email address: {email}'))

def validate_json_field(value):
    """Validate JSON field structure"""
    if not isinstance(value, dict):
        raise ValidationError(_('Value must be a JSON object'))

def validate_query_parameters(params):
    """Validate query parameters for extraction"""
    required_fields = ['table_name']
    for field in required_fields:
        if field not in params:
            raise ValidationError(_(f'Missing required field: {field}'))
    
    # Validate table name format
    table_name = params.get('table_name', '')
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
        raise ValidationError(_('Invalid table name format'))