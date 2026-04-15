from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import timedelta
from core.permissions import IsAuthenticated
from apps.connections.models import ConnectionConfig
from apps.extraction.models import ExtractionJob
from apps.storage.models import FileExport, StoredRecord


class DashboardStatsView(APIView):
    """Get dashboard statistics for the authenticated user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Get connections stats
        if user.is_admin:
            connections = ConnectionConfig.objects.all()
            extractions = ExtractionJob.objects.all()
            exports = FileExport.objects.all()
            stored_records = StoredRecord.objects.all()
        else:
            connections = ConnectionConfig.objects.filter(
                Q(created_by=user) | Q(is_active=True)
            ).distinct()
            extractions = ExtractionJob.objects.filter(created_by=user)
            exports = FileExport.objects.filter(
                Q(created_by=user) | Q(is_public=True) | Q(job__created_by=user)
            ).distinct()
            stored_records = StoredRecord.objects.filter(job__created_by=user)
        
        # Calculate stats
        total_connections = connections.count()
        active_connections = connections.filter(is_active=True).count()
        
        total_extractions = extractions.count()
        completed_extractions = extractions.filter(status='completed').count()
        
        total_records_extracted = stored_records.count()
        total_exports = exports.count()
        
        # Get recent connections (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_connections = connections.filter(
            created_at__gte=thirty_days_ago
        ).order_by('-created_at')[:5]
        
        recent_connections_data = []
        for conn in recent_connections:
            recent_connections_data.append({
                'id': conn.id,
                'name': conn.name,
                'database_type': conn.get_database_type_display(),
                'database_type_key': conn.database_type,
                'created_at': conn.created_at.isoformat(),
                'is_active': conn.is_active
            })
        
        # Get recent extractions (last 30 days)
        recent_extractions = extractions.filter(
            created_at__gte=thirty_days_ago
        ).order_by('-created_at')[:5]
        
        recent_extractions_data = []
        for ext in recent_extractions:
            recent_extractions_data.append({
                'id': ext.id,
                'name': ext.name,
                'status': ext.status,
                'status_display': ext.get_status_display(),
                'created_at': ext.created_at.isoformat(),
                'total_rows': ext.total_rows or 0,
                'progress_percentage': ext.progress_percentage
            })
        
        # Get extraction statistics by status
        extraction_by_status = {}
        for status_choice in ExtractionJob.STATUS_CHOICES:
            status_key = status_choice[0]
            count = extractions.filter(status=status_key).count()
            if count > 0:
                extraction_by_status[status_key] = count
        
        # Get connections by type
        connections_by_type = {}
        for conn in connections:
            db_type = conn.database_type
            connections_by_type[db_type] = connections_by_type.get(db_type, 0) + 1
        
        return Response({
            'total_connections': total_connections,
            'active_connections': active_connections,
            'total_extractions': total_extractions,
            'completed_extractions': completed_extractions,
            'total_records_extracted': total_records_extracted,
            'total_exports': total_exports,
            'recent_connections': recent_connections_data,
            'recent_extractions': recent_extractions_data,
            'extraction_by_status': extraction_by_status,
            'connections_by_type': connections_by_type,
        })