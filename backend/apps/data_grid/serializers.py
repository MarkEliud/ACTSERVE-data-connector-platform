from rest_framework import serializers
from .models import DataSet, DataRow

class DataRowSerializer(serializers.ModelSerializer):
    """Serializer for individual data rows"""
    changes = serializers.SerializerMethodField()
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)

    class Meta:
        model = DataRow
        fields = [
            'id', 'dataset', 'dataset_name', 'row_number', 'batch_number',
            'original_data', 'current_data', 'is_modified', 'is_valid',
            'validation_errors', 'changes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'dataset', 'row_number', 'batch_number',
            'original_data', 'created_at', 'updated_at'
        ]

    def get_changes(self, obj):
        """Get changed fields for the row"""
        return obj.get_changes()


class DataSetSerializer(serializers.ModelSerializer):
    """Serializer for data sets"""
    row_count = serializers.IntegerField(read_only=True)
    modified_count = serializers.IntegerField(read_only=True)
    invalid_count = serializers.IntegerField(read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    extraction_job_name = serializers.CharField(source='extraction_job.name', read_only=True)
    extraction_job_status = serializers.CharField(source='extraction_job.status', read_only=True)

    class Meta:
        model = DataSet
        fields = [
            'id', 'name', 'extraction_job', 'extraction_job_name',
            'extraction_job_status', 'created_by', 'created_by_email',
            'created_at', 'updated_at', 'row_count', 'modified_count',
            'invalid_count'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Create dataset with extraction job"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk row updates"""
    rows = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        help_text="List of row updates"
    )

    def validate_rows(self, value):
        """Validate rows list"""
        if not value:
            raise serializers.ValidationError("Rows list cannot be empty")
        if len(value) > 1000:
            raise serializers.ValidationError("Maximum 1000 rows per bulk update")
        
        for item in value:
            if 'id' not in item:
                raise serializers.ValidationError("Each row must have an 'id' field")
            if 'current_data' not in item:
                raise serializers.ValidationError("Each row must have 'current_data' field")
        
        return value


class RowValidationSerializer(serializers.Serializer):
    """Serializer for row validation response"""
    row_id = serializers.IntegerField()
    is_valid = serializers.BooleanField()
    errors = serializers.DictField()
    changes = serializers.DictField()