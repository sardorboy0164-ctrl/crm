from rest_framework import serializers
from .models import Quiz, Question, Choice, QuizResult, StudentQuizAnswer


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'question', 'text', 'is_correct']
        read_only_fields = ['id']


class ChoiceSafeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'quiz', 'text', 'order', 'choices']
        read_only_fields = ['id']


class QuestionSafeSerializer(serializers.ModelSerializer):
    choices = ChoiceSafeSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'order', 'choices']


class QuizSerializer(serializers.ModelSerializer):
    total_questions = serializers.IntegerField(read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default=None)
    subject_display = serializers.CharField(source='get_subject_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True, default=None)
    # Optional nested write field so a quiz can be created together with its questions
    # and answer choices in one request, e.g.:
    # "questions": [{"text": "...", "choices": [{"text": "...", "is_correct": true}, ...]}]
    questions = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'subject', 'subject_display', 'group', 'group_name',
            'teacher', 'teacher_name', 'time_limit_minutes', 'passing_score', 'is_active',
            'total_questions', 'created_at', 'questions',
        ]
        # 'teacher' is set automatically from the logged-in user (see QuizViewSet.perform_create),
        # not sent by the client — it must be read-only or every create request fails with
        # "This field is required."
        read_only_fields = ['id', 'created_at', 'teacher']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        for idx, q_data in enumerate(questions_data):
            choices_data = q_data.get('choices', [])
            question = Question.objects.create(
                quiz=quiz,
                text=q_data.get('text', ''),
                order=q_data.get('order', idx + 1),
            )
            for c_data in choices_data:
                Choice.objects.create(
                    question=question,
                    text=c_data.get('text', ''),
                    is_correct=bool(c_data.get('is_correct', False)),
                )
        return quiz


class QuizDetailSerializer(QuizSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']


class QuizStudentDetailSerializer(QuizSerializer):
    # Students need `is_correct` on each choice so the frontend can immediately
    # mark the answer as To'g'ri/Noto'g'ri right after the student confirms
    # ("Belgilash") a selection, locking the answer. Same shape as teacher view.
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']


class StudentQuizAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentQuizAnswer
        fields = ['id', 'result', 'question', 'chosen_choice', 'is_correct']
        read_only_fields = ['id', 'is_correct']


class QuizResultSerializer(serializers.ModelSerializer):
    answers = StudentQuizAnswerSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizResult
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name',
            'score', 'total_questions', 'percentage', 'completed_at', 'answers',
        ]
        read_only_fields = ['id', 'completed_at']


class SubmitQuizSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        help_text='List of {question_id, choice_id} dicts'
    )

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError('At least one answer is required.')
        return value
