from rest_framework import serializers
from .models import ExtractionJob, ExtractionBatch, ExtractionResult
from apps.connections.serializers import ConnectionConfigSerializer


class ExtractionJobSerializer(serializers.ModelSerializer):
    """Serializer for extraction jobs"""
    
    connection_name = serializers.CharField(source='connection.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ExtractionJob
        fields = [
            'id', 'name', 'description', 'connection', 'connection_name',
            'status', 'table_name', 'schema_name', 'columns', 'query',
            'filters', 'batch_size', 'created_by', 'created_by_email',
            'created_at', 'updated_at', 'completed_at', 'total_rows',
            'total_batches', 'failed_batches', 'progress_percentage'
        ]
        read_only_fields = [
            'id', 'status', 'created_by', 'created_at', 'updated_at',
            'completed_at', 'total_rows', 'total_batches', 'failed_batches'
        ]
    
    def validate(self, data):
        """Validate that either table_name or query is provided"""
        if not data.get('table_name') and not data.get('query'):
            raise serializers.ValidationError(
                "Either table_name or query must be provided"
            )
        return data
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ExtractionBatchSerializer(serializers.ModelSerializer):
    """Serializer for extraction batches"""
    
    class Meta:
        model = ExtractionBatch
        fields = [
            'id', 'job', 'batch_number', 'status', 'row_count',
            'offset', 'error_message', 'data', 'started_at',
            'completed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'row_count', 'error_message',
            'started_at', 'completed_at', 'created_at'
        ]


class ExtractionResultSerializer(serializers.ModelSerializer):
    """Serializer for extraction results"""
    
    class Meta:
        model = ExtractionResult
        fields = [
            'id', 'job', 'batch', 'row_number', 'data',
            'is_modified', 'modified_data', 'validation_errors', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StartExtractionSerializer(serializers.Serializer):
    """Serializer for starting extraction"""
    
    job_id = serializers.IntegerField()
    batch_size = serializers.IntegerField(required=False, min_value=1, max_value=100000)


class ExtractionProgressSerializer(serializers.Serializer):
    """Serializer for extraction progress"""
    
    job_id = serializers.IntegerField()