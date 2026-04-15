from django.contrib.auth.models import AbstractUser 
from django.db import models 
 
class User(AbstractUser): 
    email = models.EmailField(unique=True) 
    is_admin = models.BooleanField(default=False) 
    created_at = models.DateTimeField(auto_now_add=True) 
    updated_at = models.DateTimeField(auto_now=True) 
    
    USERNAME_FIELD = 'email' 
    REQUIRED_FIELDS = ['username'] 
    
    def __str__(self):
        return self.email

class FileShare(models.Model):
    """Model to track file sharing between users"""
    file_path = models.CharField(max_length=500)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_files_owner'
    )
    shared_with = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_files'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['file_path', 'shared_with']
    
    def __str__(self):
        return f"{self.owner.email} shared with {self.shared_with.email}"