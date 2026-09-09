from rest_framework import serializers
from .models import Battle, BattleQuestion, BattleAnswer, BattleInvite
from accounts.models import SUBJECT_CHOICES


class BattleQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BattleQuestion
        fields = [
            'id', 'battle', 'question_text', 'choice1', 'choice2',
            'choice3', 'choice4', 'correct_answer', 'asked_by',
        ]
        read_only_fields = ['id']


class BattleQuestionSafeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BattleQuestion
        fields = ['id', 'question_text', 'choice1', 'choice2', 'choice3', 'choice4']


class BattleAnswerSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.get_full_name', read_only=True)

    class Meta:
        model = BattleAnswer
        fields = ['id', 'battle', 'question', 'player', 'player_name', 'answer', 'answered_at', 'is_correct']
        read_only_fields = ['id', 'answered_at', 'is_correct']


class BattleSerializer(serializers.ModelSerializer):
    player1_name = serializers.CharField(source='player1.get_full_name', read_only=True)
    player2_name = serializers.CharField(source='player2.get_full_name', read_only=True, default=None)
    winner_name = serializers.CharField(source='winner.get_full_name', read_only=True, default=None)
    subject_display = serializers.CharField(source='get_subject_display', read_only=True)
    player1_score = serializers.IntegerField(read_only=True)
    player2_score = serializers.IntegerField(read_only=True)

    class Meta:
        model = Battle
        fields = [
            'id', 'subject', 'subject_display', 'player1', 'player1_name',
            'player2', 'player2_name', 'status', 'winner', 'winner_name',
            'player1_score', 'player2_score', 'started_at', 'finished_at',
        ]
        read_only_fields = ['id', 'started_at', 'finished_at']


class BattleDetailSerializer(BattleSerializer):
    questions = BattleQuestionSafeSerializer(many=True, read_only=True)
    answers = BattleAnswerSerializer(many=True, read_only=True)

    class Meta(BattleSerializer.Meta):
        fields = BattleSerializer.Meta.fields + ['questions', 'answers']


class BattleInviteSerializer(serializers.ModelSerializer):
    from_user_name = serializers.CharField(source='from_user.get_full_name', read_only=True)
    to_user_name = serializers.CharField(source='to_user.get_full_name', read_only=True)

    class Meta:
        model = BattleInvite
        fields = [
            'id', 'from_user', 'from_user_name', 'to_user', 'to_user_name',
            'subject', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CreateBattleSerializer(serializers.Serializer):
    subject = serializers.ChoiceField(choices=SUBJECT_CHOICES)
    player2_id = serializers.IntegerField(required=False, allow_null=True)


class AnswerBattleSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.IntegerField(min_value=1, max_value=4)


class InviteBattleSerializer(serializers.Serializer):
    to_user_id = serializers.IntegerField()
    subject = serializers.ChoiceField(choices=SUBJECT_CHOICES)
