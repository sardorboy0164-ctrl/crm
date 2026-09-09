from django.contrib import admin
from .models import Battle, BattleQuestion, BattleAnswer, BattleInvite


@admin.register(Battle)
class BattleAdmin(admin.ModelAdmin):
    list_display = ('player1', 'player2', 'subject', 'status', 'winner', 'started_at', 'finished_at')
    list_filter = ('status', 'subject', 'started_at')
    search_fields = ('player1__username', 'player2__username')


@admin.register(BattleQuestion)
class BattleQuestionAdmin(admin.ModelAdmin):
    list_display = ('battle', 'question_text', 'correct_answer', 'asked_by')
    list_filter = ('battle',)


@admin.register(BattleAnswer)
class BattleAnswerAdmin(admin.ModelAdmin):
    list_display = ('battle', 'question', 'player', 'answer', 'is_correct', 'answered_at')
    list_filter = ('is_correct',)


@admin.register(BattleInvite)
class BattleInviteAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'subject', 'status', 'created_at')
    list_filter = ('status', 'subject')
