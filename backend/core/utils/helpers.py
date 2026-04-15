import hashlib
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from django.utils import timezone

def generate_unique_id(prefix: str = '') -> str:
    """
    Generate a unique identifier with optional prefix.
    
    Args:
        prefix: Optional prefix for the ID
        
    Returns:
        Unique identifier string
    """
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')
    unique_id = f"{prefix}{timestamp}"
    return unique_id

def calculate_hash(data: Any, algorithm: str = 'sha256') -> str:
    """
    Calculate hash of data.
    
    Args:
        data: Data to hash (will be JSON serialized)
        algorithm: Hash algorithm to use
        
    Returns:
        Hash string
    """
    if algorithm == 'sha256':
        hasher = hashlib.sha256()
    elif algorithm == 'md5':
        hasher = hashlib.md5()
    else:
        hasher = hashlib.sha256()
    
    if isinstance(data, (dict, list)):
        data_str = json.dumps(data, sort_keys=True, default=str)
    else:
        data_str = str(data)
    
    hasher.update(data_str.encode('utf-8'))
    return hasher.hexdigest()

def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string (e.g., "1.5 MB")
    """
    if size_bytes < 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    if unit_index == 0:
        return f"{int(size)} {units[unit_index]}"
    return f"{size:.2f} {units[unit_index]}"

def parse_datetime(value: str) -> Optional[datetime]:
    """
    Parse datetime string to datetime object.
    
    Args:
        value: ISO format datetime string
        
    Returns:
        datetime object or None
    """
    if not value:
        return None
    
    formats = [
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    
    return None

def merge_dicts(base: Dict, override: Dict) -> Dict:
    """
    Deep merge two dictionaries.
    
    Args:
        base: Base dictionary
        override: Dictionary with values to override
        
    Returns:
        Merged dictionary
    """
    result = base.copy()
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result

def chunk_list(lst: List, chunk_size: int) -> List[List]:
    """
    Split a list into chunks.
    
    Args:
        lst: List to split
        chunk_size: Size of each chunk
        
    Returns:
        List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe storage.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    # Remove or replace unsafe characters
    unsafe_chars = '<>:"/\\|?*'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    
    # Remove leading/trailing spaces and dots
    filename = filename.strip(' .')
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = f"{name[:255-len(ext)-1]}.{ext}" if ext else filename[:255]
    
    return filename or 'unnamed'

def get_client_ip(request) -> str:
    """
    Get client IP address from Django request.
    
    Args:
        request: Django request object
        
    Returns:
        IP address string
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip