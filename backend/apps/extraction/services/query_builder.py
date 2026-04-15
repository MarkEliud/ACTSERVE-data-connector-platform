from typing import Dict, Any, List, Optional
import json


class QueryBuilder:
    """Dynamic query builder for different database types"""
    
    def __init__(self, job):
        self.job = job
        self.db_type = job.connection.database_type
    
    def build_select_query(self) -> str:
        """Build SELECT query based on job configuration"""
        # Build column list
        if self.job.columns:
            columns = ', '.join(self.job.columns)
        else:
            columns = '*'
        
        # Build table name
        table = self._get_table_name()
        
        # Build WHERE clause
        where_clause = self._build_where_clause()
        
        # Build ORDER BY clause
        order_by = self._build_order_by()
        
        # Assemble query
        query = f"SELECT {columns} FROM {table}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        if order_by:
            query += f" ORDER BY {order_by}"
        
        return query
    
    def build_count_query(self, original_query: str) -> str:
        """Build count query for pagination"""
        # For MongoDB, we don't build SQL count queries
        if self.db_type == 'mongodb':
            return original_query  # Return the collection name, count handled separately
        
        # Different syntax for different SQL databases
        if self.db_type == 'clickhouse':
            return f"SELECT COUNT(*) as count FROM ({original_query})"
        else:
            return f"SELECT COUNT(*) as count FROM ({original_query}) as subquery"
    def build_paginated_query(self, query: str, offset: int, limit: int) -> str:
        """Build paginated query with LIMIT and OFFSET"""
        # Different pagination syntax for different databases
        if self.db_type == 'mysql':
            return f"{query} LIMIT {limit} OFFSET {offset}"
        elif self.db_type == 'postgresql':
            return f"{query} LIMIT {limit} OFFSET {offset}"
        elif self.db_type == 'clickhouse':
            return f"{query} LIMIT {limit} OFFSET {offset}"
        elif self.db_type == 'mongodb':
            # MongoDB doesn't use SQL, handled separately
            return query
        else:
            return f"{query} LIMIT {limit} OFFSET {offset}"
    
    def _get_table_name(self) -> str:
        """Get fully qualified table name"""
        if self.job.schema_name:
            if self.db_type == 'mysql':
                return f"`{self.job.schema_name}`.`{self.job.table_name}`"
            elif self.db_type == 'postgresql':
                return f'"{self.job.schema_name}"."{self.job.table_name}"'
            else:
                return f"{self.job.schema_name}.{self.job.table_name}"
        else:
            if self.db_type == 'mysql':
                return f"`{self.job.table_name}`"
            elif self.db_type == 'postgresql':
                return f'"{self.job.table_name}"'
            else:
                return self.job.table_name
    
    def _build_where_clause(self) -> str:
        """Build WHERE clause from filters"""
        if not self.job.filters:
            return ''
        
        conditions = []
        for key, value in self.job.filters.items():
            condition = self._build_condition(key, value)
            if condition:
                conditions.append(condition)
        
        return ' AND '.join(conditions) if conditions else ''
    
    def _build_condition(self, key: str, value: Any) -> str:
        """Build individual filter condition"""
        if isinstance(value, dict):
            # Handle operators like $gt, $lt, etc.
            operator = value.get('operator', 'eq')
            val = value.get('value')
            
            if operator == 'eq':
                return f"{key} = {self._quote_value(val)}"
            elif operator == 'neq':
                return f"{key} != {self._quote_value(val)}"
            elif operator == 'gt':
                return f"{key} > {self._quote_value(val)}"
            elif operator == 'gte':
                return f"{key} >= {self._quote_value(val)}"
            elif operator == 'lt':
                return f"{key} < {self._quote_value(val)}"
            elif operator == 'lte':
                return f"{key} <= {self._quote_value(val)}"
            elif operator == 'like':
                return f"{key} LIKE {self._quote_value(f'%{val}%')}"
            elif operator == 'in':
                return f"{key} IN ({self._quote_list(val)})"
            elif operator == 'is_null':
                return f"{key} IS NULL"
            elif operator == 'is_not_null':
                return f"{key} IS NOT NULL"
        
        # Simple equality
        return f"{key} = {self._quote_value(value)}"
    
    def _quote_value(self, value: Any) -> str:
        """Quote value based on database type and value type"""
        if value is None:
            return 'NULL'
        
        if isinstance(value, (int, float)):
            return str(value)
        
        if isinstance(value, bool):
            return 'TRUE' if value else 'FALSE'
        
        # String values
        escaped = str(value).replace("'", "''")
        
        if self.db_type == 'mysql':
            return f"'{escaped}'"
        elif self.db_type == 'postgresql':
            return f"'{escaped}'"
        else:
            return f"'{escaped}'"
    
    def _quote_list(self, values: List) -> str:
        """Quote list of values for IN clause"""
        quoted = [self._quote_value(v) for v in values]
        return ', '.join(quoted)
    
    def _build_order_by(self) -> str:
        """Build ORDER BY clause"""
        # Default order by first column or primary key
        if self.job.columns:
            return self.job.columns[0]
        
        # Try to detect primary key
        return '1'  # Default order by first column