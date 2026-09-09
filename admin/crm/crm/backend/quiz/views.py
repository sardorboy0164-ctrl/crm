from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Quiz, Question, Choice, QuizResult, StudentQuizAnswer
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuizStudentDetailSerializer, QuestionSerializer,
    ChoiceSerializer, QuizResultSerializer, StudentQuizAnswerSerializer,
    SubmitQuizSerializer,
)


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'teacher', 'group', 'is_active']
    search_fields = ['title']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        queryset = Quiz.objects.select_related('teacher', 'group').all()
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()

        if user.role == 'oquvchi':
            # O'quvchi faqat O'Z guruhidagi (va o'z fanidagi) testlarni ko'radi,
            # boshqa guruhlarning testlarini emas.
            from academy.models import GroupStudent
            group_ids = GroupStudent.objects.filter(
                student=user, is_active=True
            ).values_list('group_id', flat=True)
            subject_ids = GroupStudent.objects.filter(
                student=user, is_active=True
            ).values_list('group__subject', flat=True)
            return queryset.filter(is_active=True).filter(
                Q(group__in=group_ids) | Q(group__isnull=True, subject__in=subject_ids)
            )
        elif user.role == 'ota_ona':
            # Ota-ona faqat farzandlari o'qiyotgan guruhlarning testlarini ko'radi.
            from academy.models import GroupStudent
            child_ids = user.children.values_list('student_id', flat=True)
            group_ids = GroupStudent.objects.filter(
                student_id__in=child_ids, is_active=True
            ).values_list('group_id', flat=True)
            return queryset.filter(is_active=True).filter(group__in=group_ids)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            user = getattr(self.request, 'user', None)
            if user is not None and getattr(user, 'role', None) == 'oquvchi':
                return QuizStudentDetailSerializer
            return QuizDetailSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        # 'teacher' is required on the model but the frontend never sends it (and
        # shouldn't have to) — it was returning "This field is required." on every
        # attempt to save a quiz. Assign the logged-in teacher automatically instead.
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=['post'])
    def submit_quiz(self, request, pk=None):
        quiz = self.get_object()
        serializer = SubmitQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_data = serializer.validated_data['answers']
        student = request.user

        if QuizResult.objects.filter(quiz=quiz, student=student).exists():
            return Response(
                {'error': 'You have already completed this quiz.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        correct_count = 0
        total = quiz.total_questions
        result = QuizResult.objects.create(
            quiz=quiz,
            student=student,
            total_questions=total,
        )

        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            choice_id = answer_data.get('choice_id')

            try:
                question = Question.objects.get(id=question_id, quiz=quiz)
            except Question.DoesNotExist:
                continue

            chosen_choice = None
            is_correct = False
            if choice_id:
                try:
                    chosen_choice = Choice.objects.get(id=choice_id, question=question)
                    is_correct = chosen_choice.is_correct
                    if is_correct:
                        correct_count += 1
                except Choice.DoesNotExist:
                    pass

            StudentQuizAnswer.objects.create(
                result=result,
                question=question,
                chosen_choice=chosen_choice,
                is_correct=is_correct,
            )

        percentage = (correct_count / total * 100) if total > 0 else 0
        result.score = correct_count
        result.percentage = round(percentage, 2)
        result.save()

        # Testni muvaffaqiyatli boshlab tugatgan o'quvchiga coin berish.
        # Ilgari frontend "X coin olindingiz" degan edi, lekin backendda coin
        # umuman berilmas edi.
        coins = max(1, int(percentage // 10))
        from coin.models import CoinTransaction
        CoinTransaction.objects.create(
            user=student,
            amount=coins,
            transaction_type='earn',
            description=f"Test yakunlandi: {quiz.title} ({percentage}%)",
        )

        data = QuizResultSerializer(result).data
        data['coins_earned'] = coins
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        quiz = self.get_object()
        results = QuizResult.objects.filter(quiz=quiz).select_related('student')
        serializer = QuizResultSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-results')
    def my_results(self, request):
        results = QuizResult.objects.filter(student=request.user).select_related('quiz')
        serializer = QuizResultSerializer(results, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.prefetch_related('choices').all()
    serializer_class = QuestionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['quiz']
    ordering_fields = ['order']


class ChoiceViewSet(viewsets.ModelViewSet):
    queryset = Choice.objects.all()
    serializer_class = ChoiceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['question', 'is_correct']


class QuizResultViewSet(viewsets.ModelViewSet):
    serializer_class = QuizResultSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['quiz', 'student']
    ordering_fields = ['completed_at', 'percentage']

    def get_queryset(self):
        user = self.request.user
        qs = QuizResult.objects.select_related('quiz', 'student').prefetch_related('answers')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'oquvchi':
            return qs.filter(student=user)
        if user.role == 'ota_ona':
            child_ids = user.children.values_list('student_id', flat=True)
            return qs.filter(student_id__in=child_ids)
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(quiz__teacher=user)
        return qs


class StudentQuizAnswerViewSet(viewsets.ModelViewSet):
    queryset = StudentQuizAnswer.objects.select_related('result', 'question', 'chosen_choice').all()
    serializer_class = StudentQuizAnswerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['result', 'question', 'is_correct']
