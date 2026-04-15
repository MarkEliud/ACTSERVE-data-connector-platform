# scripts/seed_data.py
#!/usr/bin/env python3
"""
Seed database with test data for development
"""

import os
import sys
import django
from datetime import datetime, timedelta
import random

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from backend.apps.connections.models import Connection
from backend.apps.extraction.models import ExtractionJob, ExtractionBatch
from backend.apps.data_grid.models import DataSet, DataRow

User = get_user_model()

def create_users():
    """Create test users"""
    print("Creating test users...")
    
    admin, _ = User.objects.get_or_create(
        email='admin@example.com',
        defaults={
            'username': 'admin',
            'first_name': 'Admin',
            'last_name': 'User',
            'is_admin': True,
            'is_active': True
        }
    )
    admin.set_password('admin123')
    admin.save()
    
    user, _ = User.objects.get_or_create(
        email='user@example.com',
        defaults={
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'User',
            'is_admin': False,
            'is_active': True
        }
    )
    user.set_password('test123')
    user.save()
    
    print(f"Created users: {admin.email}, {user.email}")
    return admin, user

def create_connections(user):
    """Create test connections"""
    print("Creating test connections...")
    
    connections_data = [
        {
            'name': 'Production PostgreSQL',
            'description': 'Main production database',
            'database_type': 'postgresql',
            'host': 'localhost',
            'port': 5432,
            'database_name': 'production_db',
            'user': 'postgres',
            'is_active': True,
        },
        {
            'name': 'Analytics MySQL',
            'description': 'Analytics data warehouse',
            'database_type': 'mysql',
            'host': 'localhost',
            'port': 3306,
            'database_name': 'analytics',
            'user': 'root',
            'is_active': True,
        },
        {
            'name': 'MongoDB Atlas',
            'description': 'Document store for logs',
            'database_type': 'mongodb',
            'host': 'localhost',
            'port': 27017,
            'database_name': 'logs',
            'user': 'mongodb',
            'is_active': False,
        }
    ]
    
    connections = []
    for data in connections_data:
        conn, _ = Connection.objects.get_or_create(
            name=data['name'],
            defaults={
                **data,
                'created_by': user,
                'password': 'testpassword123'
            }
        )
        connections.append(conn)
        print(f"Created connection: {conn.name}")
    
    return connections

def create_extraction_jobs(user, connections):
    """Create test extraction jobs"""
    print("Creating test extraction jobs...")
    
    jobs = []
    statuses = ['completed', 'completed', 'running', 'pending', 'failed']
    
    for i in range(10):
        status = random.choice(statuses)
        total_rows = random.randint(1000, 100000)
        total_batches = total_rows // 1000 + (1 if total_rows % 1000 else 0)
        
        job = ExtractionJob.objects.create(
            name=f"Extraction Job {i+1}",
            description=f"Test extraction job {i+1}",
            connection=random.choice(connections),
            table_name=f"table_{i+1}",
            batch_size=1000,
            status=status,
            total_rows=total_rows if status == 'completed' else 0,
            total_batches=total_batches if status == 'completed' else 0,
            progress_percentage=100 if status == 'completed' else random.randint(0, 99),
            created_by=user,
            created_at=datetime.now() - timedelta(days=random.randint(0, 30)),
            completed_at=datetime.now() if status == 'completed' else None
        )
        jobs.append(job)
        print(f"Created extraction job: {job.name} ({status})")
    
    return jobs

def create_batches(jobs):
    """Create test extraction batches"""
    print("Creating test extraction batches...")
    
    batch_count = 0
    for job in jobs:
        if job.status == 'completed' and job.total_batches > 0:
            for batch_num in range(1, min(job.total_batches, 10) + 1):
                ExtractionBatch.objects.create(
                    job=job,
                    batch_number=batch_num,
                    status='completed',
                    row_count=1000,
                    start_row=(batch_num - 1) * 1000 + 1,
                    end_row=batch_num * 1000,
                    created_at=job.created_at,
                    completed_at=job.completed_at
                )
                batch_count += 1
    
    print(f"Created {batch_count} extraction batches")

def create_dataset_and_rows(jobs):
    """Create test datasets and rows for completed jobs"""
    print("Creating test datasets and rows...")
    
    for job in jobs:
        if job.status == 'completed':
            dataset = DataSet.objects.create(
                extraction_job=job,
                name=f"Dataset for {job.name}",
                row_count=job.total_rows,
                column_count=5
            )
            
            # Create sample rows
            for row_num in range(1, min(job.total_rows, 100) + 1):
                original_data = {
                    'id': row_num,
                    'name': f"Record {row_num}",
                    'value': random.randint(1, 1000),
                    'created_at': datetime.now().isoformat(),
                    'is_active': random.choice([True, False])
                }
                
                is_modified = random.choice([True, False]) if row_num <= 10 else False
                current_data = original_data.copy()
                if is_modified:
                    current_data['value'] = random.randint(1, 2000)
                
                DataRow.objects.create(
                    dataset=dataset,
                    row_number=row_num,
                    original_data=original_data,
                    current_data=current_data,
                    is_modified=is_modified,
                    is_valid=not is_modified or random.choice([True, False])
                )
            
            print(f"Created dataset for {job.name} with {dataset.row_count} rows")

def main():
    """Main seed function"""
    print("Starting database seeding...")
    
    admin, user = create_users()
    connections = create_connections(user)
    jobs = create_extraction_jobs(user, connections)
    create_batches(jobs)
    create_dataset_and_rows(jobs)
    
    print("\nSeeding completed successfully!")
    print("\nTest credentials:")
    print("  Admin: admin@example.com / admin123")
    print("  User: user@example.com / test123")

if __name__ == '__main__':
    main()