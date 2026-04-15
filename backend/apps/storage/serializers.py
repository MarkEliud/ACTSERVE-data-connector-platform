from rest_framework import serializers
from .models import StoredRecord, FileExport
from apps.extraction.serializers import ExtractionJobSerializer

class StoredRecordSerializer(serializers.ModelSerializer):
    """Serializer for stored records"""
    job_name = serializers.CharField(source='job.name', read_only=True)
    has_changes = serializers.SerializerMethodField()

    class Meta:
        model = StoredRecord
        fields = [
            'id', 'job', 'job_name', 'row_number', 'data',
            'original_data', 'is_modified', 'validation_status',
            'has_changes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_has_changes(self, obj):
        """Check if data has been modified from original"""
        return obj.data != obj.original_data

class FileExportSerializer(serializers.ModelSerializer):
    """Serializer for file exports"""
    job_name = serializers.CharField(source='job.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    download_url = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    file_extension = serializers.CharField(read_only=True)
    can_access = serializers.SerializerMethodField()

    class Meta:
        model = FileExport
        fields = [
            'id', 'job', 'job_name', 'file_format', 'status',
            'file_name', 'file_path', 'file_size', 'file_hash',
            'metadata', 'created_by', 'created_by_email',
            'is_public', 'is_expired', 'file_extension',
            'download_url', 'can_access', 'created_at',
            'updated_at', 'expires_at'
        ]
        read_only_fields = [
            'id', 'file_path', 'file_size', 'file_hash',
            'created_at', 'updated_at', 'download_url',
            'is_expired', 'file_extension', 'can_access'
        ]

    def get_can_access(self, obj):
        """Check if current user can access this file"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.get_access_permissions(request.user)
        return False

    def create(self, validated_data):
        """Create file export with current user"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class FileExportCreateSerializer(serializers.Serializer):
    """Serializer for creating file exports"""
    job_id = serializers.IntegerField(required=True)
    file_format = serializers.ChoiceField(
        choices=['json', 'csv'],
        default='json'
    )
    include_modified_only = serializers.BooleanField(default=False)
    expires_in_days = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=365,
        help_text="Number of days until file expires"
    )

    def validate_job_id(self, value):
        """Validate job exists and user has access"""
        from apps.extraction.models import ExtractionJob
        try:
            job = ExtractionJob.objects.get(id=value)
            request = self.context.get('request')
            if request and not request.user.is_admin:
                if job.created_by != request.user:
                    raise serializers.ValidationError(
                        "You don't have access to this job"
                    )
            return value
        except ExtractionJob.DoesNotExist:
            raise serializers.ValidationError("Job not found")

class FileShareSerializer(serializers.Serializer):
    """Serializer for sharing files with other users"""
    file_id = serializers.IntegerField(required=True)
    user_email = serializers.EmailField(required=True)
    message = serializers.CharField(required=False, allow_blank=True)

    def validate_user_email(self, value):
        """Validate user exists"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User not found")
        return value

    def validate(self, data):
        """Validate file and user access"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Invalid request")

        try:
            file_export = FileExport.objects.get(id=data['file_id'])
            if file_export.created_by != request.user and not request.user.is_admin:
                raise serializers.ValidationError(
                    "You don't have permission to share this file"
                )
        except FileExport.DoesNotExist:
            raise serializers.ValidationError("File not found")

        # Check not sharing with self
        if data['user_email'] == request.user.email:
            raise serializers.ValidationError("Cannot share with yourself")

        return data