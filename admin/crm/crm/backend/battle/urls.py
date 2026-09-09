from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'battles', views.BattleViewSet, basename='battle')
router.register(r'battle-questions', views.BattleQuestionViewSet)
router.register(r'battle-answers', views.BattleAnswerViewSet)
router.register(r'battle-invites', views.BattleInviteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
