from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_active', 'is_admin')
    list_filter = ('is_active', 'is_admin')
    search_fields = ('email', 'username')
    ordering = ('email',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('is_admin',)}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('is_admin',)}),
    )
