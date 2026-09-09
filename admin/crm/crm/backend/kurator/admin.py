from django.contrib import admin
from .models import KuratorPhoto, KuratorReport, StudentStatus


@admin.register(KuratorPhoto)
class KuratorPhotoAdmin(admin.ModelAdmin):
    list_display = ('kurator', 'group', 'date', 'lesson_topic')
    list_filter = ('date', 'group')
    search_fields = ('description', 'lesson_topic')


@admin.register(KuratorReport)
class KuratorReportAdmin(admin.ModelAdmin):
    list_display = ('kurator', 'date')
    list_filter = ('date',)
    filter_horizontal = ('groups_covered',)


@admin.register(StudentStatus)
class StudentStatusAdmin(admin.ModelAdmin):
    list_display = ('student', 'status', 'kurator', 'created_at')
    list_filter = ('status',)
    search_fields = ('student__first_name', 'student__last_name', 'comment')
