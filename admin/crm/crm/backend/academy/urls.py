from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'group-students', views.GroupStudentViewSet, basename='groupstudent')
router.register(r'attendances', views.AttendanceViewSet, basename='attendance')
router.register(r'homeworks', views.HomeworkViewSet, basename='homework')
router.register(r'submissions', views.HomeworkSubmissionViewSet, basename='homeworksubmission')
router.register(r'lessons', views.LessonViewSet)
router.register(r'additional-teachers', views.AdditionalTeacherStudentViewSet, basename='additionalteacher')

urlpatterns = [
    path('', include(router.urls)),
]
