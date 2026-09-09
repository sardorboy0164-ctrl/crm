from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'questions', views.QuestionViewSet)
router.register(r'choices', views.ChoiceViewSet)
router.register(r'results', views.QuizResultViewSet, basename='quizresult')
router.register(r'answers', views.StudentQuizAnswerViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
