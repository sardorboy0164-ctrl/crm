from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Battle, BattleQuestion, BattleAnswer, BattleInvite
from .serializers import (
    BattleSerializer, BattleDetailSerializer, BattleQuestionSerializer,
    BattleAnswerSerializer, BattleInviteSerializer,
    CreateBattleSerializer, AnswerBattleSerializer, InviteBattleSerializer,
)

BATTLE_QUESTIONS_COUNT = 8
BATTLE_WIN_COINS = 2


def _generate_battle_questions(battle, count=BATTLE_QUESTIONS_COUNT):
    """Jang uchun shu fandan mavjud testlar asosida savollar yaratadi.

    Ilgari jang yaratilganda hech qanday savol qo'shilmas edi, shuning uchun
    arena bo'sh turar edi.
    """
    if battle.questions.exists():
        return

    from quiz.models import Question as QuizQuestion

    bank = list(
        QuizQuestion.objects.filter(
            quiz__subject=battle.subject, quiz__is_active=True
        ).prefetch_related('choices')
    )
    added = 0
    for q in bank:
        if added >= count:
            break
        choices = list(q.choices.all())
        correct_idx = next((i for i, c in enumerate(choices) if c.is_correct), None)
        if len(choices) < 2 or correct_idx is None:
            continue
        correct = choices[correct_idx]
        wrongs = [c for i, c in enumerate(choices) if i != correct_idx][:3]
        pool = wrongs[:3]
        pool.insert(min(len(pool), 3), correct)
        pool = (pool[:4] + [None] * 4)[:4]
        correct_answer = pool.index(correct) + 1

        BattleQuestion.objects.create(
            battle=battle,
            question_text=q.text,
            choice1=pool[0].text if pool[0] else '',
            choice2=pool[1].text if pool[1] else '',
            choice3=pool[2].text if pool[2] else '',
            choice4=pool[3].text if pool[3] else '',
            correct_answer=correct_answer,
        )
        added += 1


class BattleViewSet(viewsets.ModelViewSet):
    serializer_class = BattleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'status', 'player1', 'player2', 'winner']
    ordering_fields = ['started_at', 'finished_at']

    def get_queryset(self):
        user = self.request.user
        qs = Battle.objects.select_related('player1', 'player2', 'winner')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'admin':
            return qs
        # Foydalanuvchi faqat o'zi ishtirok etayotgan janglarni ko'radi.
        # Kutayotgan janglar esa boshqa o'quvchilarga ham ko'rinib, qo'shila bilishi kerak.
        return qs.filter(Q(player1=user) | Q(player2=user) | Q(status='waiting'))

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BattleDetailSerializer
        return BattleSerializer

    @action(detail=False, methods=['post'])
    def create_battle(self, request):
        serializer = CreateBattleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        player2_id = serializer.validated_data.get('player2_id')
        battle = Battle.objects.create(
            subject=serializer.validated_data['subject'],
            player1=request.user,
            player2_id=player2_id,
            status='active' if player2_id else 'waiting',
        )
        _generate_battle_questions(battle)
        if battle.questions.count() == 0:
            return Response(
                {'error': 'Bu fan bo\'yicha hali testlar mavjud emas, jang boshlab bo\'lmaydi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(BattleSerializer(battle).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def answer_battle(self, request, pk=None):
        battle = self.get_object()

        if battle.status != 'active':
            return Response({'error': 'Battle is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in [battle.player1, battle.player2]:
            return Response({'error': 'You are not a player in this battle.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AnswerBattleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question_id = serializer.validated_data['question_id']
        answer_num = serializer.validated_data['answer']

        try:
            question = BattleQuestion.objects.get(id=question_id, battle=battle)
        except BattleQuestion.DoesNotExist:
            return Response({'error': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)

        if BattleAnswer.objects.filter(battle=battle, question=question, player=request.user).exists():
            return Response({'error': 'Already answered this question.'}, status=status.HTTP_400_BAD_REQUEST)

        is_correct = question.correct_answer == answer_num
        battle_answer = BattleAnswer.objects.create(
            battle=battle,
            question=question,
            player=request.user,
            answer=answer_num,
            is_correct=is_correct,
        )

        all_answered = BattleAnswer.objects.filter(
            battle=battle, player=request.user
        ).count() >= battle.questions.count()

        all_done = False
        if all_answered:
            p1_total = BattleAnswer.objects.filter(battle=battle, player=battle.player1).count()
            p2_total = BattleAnswer.objects.filter(battle=battle, player=battle.player2).count() if battle.player2 else 0
            if p1_total >= battle.questions.count() and p2_total >= battle.questions.count():
                all_done = True

        if all_done:
            battle.status = 'finished'
            battle.finished_at = timezone.now()
            if battle.player1_score > battle.player2_score:
                battle.winner = battle.player1
            elif battle.player2_score > battle.player1_score:
                battle.winner = battle.player2
            battle.save()

            # G'olibga coin beriladi.
            if battle.winner:
                from coin.models import CoinTransaction
                CoinTransaction.objects.create(
                    user=battle.winner,
                    amount=BATTLE_WIN_COINS,
                    transaction_type='earn',
                    description=f"Jangda g'alaba: {battle.subject}",
                )

        coins_earned = BATTLE_WIN_COINS if (all_done and battle.winner == request.user) else 0
        return Response({
            'is_correct': is_correct,
            'correct_answer': question.correct_answer,
            'player1_score': battle.player1_score,
            'player2_score': battle.player2_score,
            'battle_finished': all_done,
            'winner_id': battle.winner_id if all_done else None,
            'coins_earned': coins_earned if all_done else 0,
        })

    @action(detail=True, methods=['post'], url_path='join')
    def join_battle(self, request, pk=None):
        try:
            battle = Battle.objects.select_related('player1', 'player2', 'winner').get(pk=pk)
        except Battle.DoesNotExist:
            return Response({'error': 'Battle not found.'}, status=status.HTTP_404_NOT_FOUND)
        if battle.status != 'waiting':
            return Response({'error': 'Battle is not waiting for players.'}, status=status.HTTP_400_BAD_REQUEST)
        if battle.player1 == request.user:
            return Response({'error': 'Cannot join your own battle.'}, status=status.HTTP_400_BAD_REQUEST)
        battle.player2 = request.user
        battle.status = 'active'
        battle.save()
        _generate_battle_questions(battle)
        return Response(BattleSerializer(battle).data)


class BattleQuestionViewSet(viewsets.ModelViewSet):
    queryset = BattleQuestion.objects.select_related('battle', 'asked_by').all()
    serializer_class = BattleQuestionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['battle', 'asked_by']


class BattleAnswerViewSet(viewsets.ModelViewSet):
    queryset = BattleAnswer.objects.select_related('battle', 'question', 'player').all()
    serializer_class = BattleAnswerSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['battle', 'player', 'is_correct']
    ordering_fields = ['answered_at']


class BattleInviteViewSet(viewsets.ModelViewSet):
    queryset = BattleInvite.objects.select_related('from_user', 'to_user').all()
    serializer_class = BattleInviteSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['from_user', 'to_user', 'subject', 'status']
    ordering_fields = ['created_at']

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        invite = self.get_object()
        if invite.to_user != request.user:
            return Response({'error': 'Not your invite.'}, status=status.HTTP_403_FORBIDDEN)
        invite.status = 'accepted'
        invite.save()

        battle = Battle.objects.create(
            subject=invite.subject,
            player1=invite.from_user,
            player2=invite.to_user,
            status='active',
        )
        return Response({
            'invite': BattleInviteSerializer(invite).data,
            'battle': BattleSerializer(battle).data,
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        invite = self.get_object()
        if invite.to_user != request.user:
            return Response({'error': 'Not your invite.'}, status=status.HTTP_403_FORBIDDEN)
        invite.status = 'rejected'
        invite.save()
        return Response(BattleInviteSerializer(invite).data)

    @action(detail=False, methods=['get'], url_path='my-invites')
    def my_invites(self, request):
        invites = BattleInvite.objects.filter(to_user=request.user, status='pending')
        serializer = BattleInviteSerializer(invites, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def invite_battle(self, request):
        serializer = InviteBattleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invite = BattleInvite.objects.create(
            from_user=request.user,
            to_user_id=serializer.validated_data['to_user_id'],
            subject=serializer.validated_data['subject'],
        )
        return Response(BattleInviteSerializer(invite).data, status=status.HTTP_201_CREATED)
