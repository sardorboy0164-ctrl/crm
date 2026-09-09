from django.contrib import admin
from .models import Group, GroupStudent, Attendance, Homework, HomeworkSubmission, Lesson, AdditionalTeacherStudent, TutorSession


@admin.register(TutorSession)
class TutorSessionAdmin(admin.ModelAdmin):
    list_display = ('student', 'teacher', 'date', 'started_at', 'ended_at')
    list_filter = ('date',)
    search_fields = ('student__first_name', 'student__last_name', 'teacher__first_name', 'teacher__last_name')


@admin.register(AdditionalTeacherStudent)
class AdditionalTeacherStudentAdmin(admin.ModelAdmin):
    list_display = ('student', 'teacher', 'weekday', 'time', 'is_active')
    list_filter = ('weekday', 'is_active')
    search_fields = ('student__first_name', 'student__last_name', 'teacher__first_name', 'teacher__last_name')


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'teacher', 'kurator', 'room', 'max_students', 'created_at')
    list_filter = ('subject', 'created_at')
    search_fields = ('name', 'room')


@admin.register(GroupStudent)
class GroupStudentAdmin(admin.ModelAdmin):
    list_display = ('group', 'student', 'joined_at', 'is_active')
    list_filter = ('is_active', 'group')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'group', 'date', 'is_present', 'marked_by')
    list_filter = ('is_present', 'date', 'group')


@admin.register(Homework)
class HomeworkAdmin(admin.ModelAdmin):
    list_display = ('title', 'group', 'due_date', 'created_by', 'created_at')
    list_filter = ('group', 'due_date')


@admin.register(HomeworkSubmission)
class HomeworkSubmissionAdmin(admin.ModelAdmin):
    list_display = ('homework', 'student', 'submitted_at', 'grade')
    list_filter = ('grade', 'submitted_at')


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('topic', 'group', 'date', 'teacher', 'room')
    list_filter = ('date', 'group')
    search_fields = ('topic',)
