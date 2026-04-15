from typing import Dict, Any, Tuple, List


def validate_row_data(
    current_data: Dict[str, Any],
    original_data: Dict[str, Any],
    custom_rules: List[Dict] = None
) -> Tuple[bool, Dict[str, str]]:
    """
    Validate row data against original data and custom rules.
    
    Args:
        current_data: The new/edited data
        original_data: The original extracted data
        custom_rules: Optional list of custom validation rules
        
    Returns:
        Tuple of (is_valid, errors_dict)
    """
    errors = {}
    is_valid = True
    
    # Check for required fields (fields that were present in original)
    for key, value in original_data.items():
        # Skip if field is not in current data (allow removal)
        if key not in current_data:
            continue
            
        current_value = current_data[key]
        
        # Check for null on previously non-null fields
        if value is not None and current_value is None:
            # Allow nulling only for specific field patterns
            if key.lower() not in ['description', 'notes', 'comment', 'middle_name']:
                errors[key] = f"Field '{key}' cannot be null"
                is_valid = False
        
        # Type validation
        if not _validate_type(current_value, value):
            errors[key] = f"Field '{key}' has invalid type"
            is_valid = False
        
        # String length validation
        if isinstance(value, str) and isinstance(current_value, str):
            if len(current_value) > 10000:
                errors[key] = f"Field '{key}' exceeds maximum length"
                is_valid = False
        
        # Number range validation
        if isinstance(value, (int, float)) and isinstance(current_value, (int, float)):
            if current_value < -1000000000 or current_value > 1000000000:
                errors[key] = f"Field '{key}' exceeds valid range"
                is_valid = False
    
    # Check for new fields (fields not in original)
    for key in current_data.keys():
        if key not in original_data:
            # Allow new fields but validate them
            if current_data[key] is None:
                continue
            if not _validate_basic_type(current_data[key]):
                errors[key] = f"New field '{key}' has invalid type"
                is_valid = False
    
    # Apply custom validation rules if provided
    if custom_rules:
        custom_valid, custom_errors = _apply_custom_rules(
            current_data,
            custom_rules
        )
        if not custom_valid:
            is_valid = False
            errors.update(custom_errors)
    
    return is_valid, errors


def _validate_type(current_value: Any, original_value: Any) -> bool:
    """
    Validate that current value type matches original value type.
    
    Args:
        current_value: The new value
        original_value: The original value
        
    Returns:
        bool: True if types are compatible
    """
    # Null values are allowed
    if current_value is None:
        return True
    
    # Original null allows any type
    if original_value is None:
        return True
    
    # Same type
    if type(current_value) == type(original_value):
        return True
    
    # Int to float is allowed
    if isinstance(original_value, float) and isinstance(current_value, int):
        return True
    
    # Number to string conversion (for display purposes)
    if isinstance(original_value, (int, float)) and isinstance(current_value, str):
        try:
            if isinstance(original_value, int):
                int(current_value)
            else:
                float(current_value)
            return True
        except ValueError:
            return False
    
    # String to number conversion
    if isinstance(original_value, str) and isinstance(current_value, (int, float)):
        return True
    
    return False


def _validate_basic_type(value: Any) -> bool:
    """
    Validate that value is a basic JSON-serializable type.
    
    Args:
        value: The value to validate
        
    Returns:
        bool: True if valid basic type
    """
    if value is None:
        return True
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        return True
    if isinstance(value, list):
        return all(_validate_basic_type(item) for item in value)
    if isinstance(value, dict):
        return all(
            isinstance(k, str) and _validate_basic_type(v)
            for k, v in value.items()
        )
    return False


def _apply_custom_rules(
    data: Dict[str, Any],
    rules: List[Dict]
) -> Tuple[bool, Dict[str, str]]:
    """
    Apply custom validation rules to data.
    
    Args:
        data: The data to validate
        rules: List of validation rules
        
    Returns:
        Tuple of (is_valid, errors_dict)
    """
    errors = {}
    is_valid = True
    
    for rule in rules:
        field = rule.get('field')
        rule_type = rule.get('type')
        message = rule.get('message', f"Validation failed for {field}")
        
        if field not in data:
            continue
        
        value = data[field]
        
        if rule_type == 'required' and (value is None or value == ''):
            errors[field] = message
            is_valid = False
        
        elif rule_type == 'min_length' and isinstance(value, str):
            min_len = rule.get('value', 0)
            if len(value) < min_len:
                errors[field] = message
                is_valid = False
        
        elif rule_type == 'max_length' and isinstance(value, str):
            max_len = rule.get('value', 1000)
            if len(value) > max_len:
                errors[field] = message
                is_valid = False
        
        elif rule_type == 'min_value' and isinstance(value, (int, float)):
            min_val = rule.get('value', 0)
            if value < min_val:
                errors[field] = message
                is_valid = False
        
        elif rule_type == 'max_value' and isinstance(value, (int, float)):
            max_val = rule.get('value', 1000000)
            if value > max_val:
                errors[field] = message
                is_valid = False
        
        elif rule_type == 'pattern' and isinstance(value, str):
            import re
            pattern = rule.get('value', '.*')
            if not re.match(pattern, value):
                errors[field] = message
                is_valid = False
        
        elif rule_type == 'email' and isinstance(value, str):
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, value):
                errors[field] = message
                is_valid = False
    
    return is_valid, errors


def validate_batch_data(
    rows_data: List[Dict[str, Any]],
    original_rows: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Validate a batch of rows.
    
    Args:
        rows_data: List of row data dictionaries
        original_rows: List of original row data
        
    Returns:
        Dictionary with validation summary
    """
    results = {
        'total': len(rows_data),
        'valid': 0,
        'invalid': 0,
        'errors': []
    }
    
    for i, row_data in enumerate(rows_data):
        if i < len(original_rows):
            is_valid, errors = validate_row_data(
                row_data.get('current_data', {}),
                original_rows[i]
            )
            
            if is_valid:
                results['valid'] += 1
            else:
                results['invalid'] += 1
                results['errors'].append({
                    'row_index': i,
                    'errors': errors
                })
        else:
            results['invalid'] += 1
            results['errors'].append({
                'row_index': i,
                'errors': {'row': 'Original data not found'}
            })
    
    return results