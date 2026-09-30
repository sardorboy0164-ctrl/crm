from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/academy/', include('academy.urls')),
    path('api/quiz/', include('quiz.urls')),
    path('api/battle/', include('battle.urls')),
    path('api/coin/', include('coin.urls')),
    path('api/post/', include('post.urls')),
    path('api/kurator/', include('kurator.urls')),
    path('api/chat/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static('/assets/', document_root=settings.STATIC_ROOT)

# Serve React frontend for all non-API routes
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/|assets/).*$', TemplateView.as_view(template_name='index.html'), name='frontend'),
]
