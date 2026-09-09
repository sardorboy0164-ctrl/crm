from django.db import models
from django.conf import settings
from accounts.models import SUBJECT_CHOICES


class Battle(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('active', 'Active'),
        ('finished', 'Finished'),
    ]

    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battles_as_player1',
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battles_as_player2',
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='waiting')
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='battle_wins',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        p2 = self.player2.get_full_name() if self.player2 else 'TBD'
        return f"Battle: {self.player1.get_full_name()} vs {p2} ({self.get_subject_display()})"

    @property
    def player1_score(self):
        correct = BattleAnswer.objects.filter(
            battle=self, player=self.player1, is_correct=True
        ).count()
        return correct

    @property
    def player2_score(self):
        if not self.player2:
            return 0
        correct = BattleAnswer.objects.filter(
            battle=self, player=self.player2, is_correct=True
        ).count()
        return correct


class BattleQuestion(models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    choice1 = models.CharField(max_length=300)
    choice2 = models.CharField(max_length=300)
    choice3 = models.CharField(max_length=300)
    choice4 = models.CharField(max_length=300)
    correct_answer = models.PositiveIntegerField(
        help_text='1-4 corresponding to choice1-choice4'
    )
    asked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='battle_questions_asked',
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"Battle Q: {self.question_text[:50]}"


class BattleAnswer(models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(BattleQuestion, on_delete=models.CASCADE, related_name='answers')
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battle_answers',
    )
    answer = models.PositiveIntegerField(
        help_text='1-4 corresponding to choice1-choice4'
    )
    answered_at = models.DateTimeField(auto_now_add=True)
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('battle', 'question', 'player')
        ordering = ['answered_at']

    def __str__(self):
        return f"{self.player.get_full_name()} answered Q{self.question.id}"


class BattleInvite(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battle_invites_sent',
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='battle_invites_received',
    )
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user.get_full_name()} -> {self.to_user.get_full_name()} ({self.subject})"
