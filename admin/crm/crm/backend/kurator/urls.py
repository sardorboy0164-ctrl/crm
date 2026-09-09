from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'photos', views.KuratorPhotoViewSet)
router.register(r'reports', views.KuratorReportViewSet)
router.register(r'statuses', views.StudentStatusViewSet, basename='studentstatus')

urlpatterns = [
    path('', include(router.urls)),
]
