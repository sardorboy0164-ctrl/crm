from django.contrib import admin
from .models import Quiz, Question, Choice, QuizResult, StudentQuizAnswer


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'teacher', 'time_limit_minutes', 'passing_score', 'is_active', 'created_at')
    list_filter = ('subject', 'is_active', 'created_at')
    search_fields = ('title',)
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'text', 'order')
    list_filter = ('quiz',)
    inlines = [ChoiceInline]


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ('question', 'text', 'is_correct')
    list_filter = ('is_correct',)


@admin.register(QuizResult)
class QuizResultAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'student', 'score', 'total_questions', 'percentage', 'completed_at')
    list_filter = ('quiz', 'completed_at')


@admin.register(StudentQuizAnswer)
class StudentQuizAnswerAdmin(admin.ModelAdmin):
    list_display = ('result', 'question', 'chosen_choice', 'is_correct')
    list_filter = ('is_correct',)
