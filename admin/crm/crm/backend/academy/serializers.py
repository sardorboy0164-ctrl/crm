from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import (
    Group, GroupStudent, Attendance, Homework, HomeworkSubmission, Lesson,
    AdditionalTeacherStudent,
)


class AdditionalTeacherStudentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_detail = UserSerializer(source='student', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    subject_display = serializers.CharField(source='get_subject_display', read_only=True, default=None)

    class Meta:
        model = AdditionalTeacherStudent
        fields = [
            'id', 'teacher', 'teacher_name', 'student', 'student_name',
            'student_detail', 'subject', 'subject_display', 'weekday',
            'weekday_display', 'time', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GroupSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default=None)
    kurator_name = serializers.CharField(source='kurator.get_full_name', read_only=True, default=None)
    subject_display = serializers.CharField(source='get_subject_display', read_only=True)
    current_students_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'subject', 'subject_display', 'teacher', 'teacher_name',
            'kurator', 'kurator_name', 'room', 'schedule', 'max_students',
            'current_students_count', 'is_full', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GroupStudentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    # Full nested student object (id, first_name, last_name, username, ...) for read access.
    # 'student' itself stays a plain writable PK field so creating a GroupStudent still works.
    student_detail = UserSerializer(source='student', read_only=True)

    class Meta:
        model = GroupStudent
        fields = ['id', 'group', 'student', 'student_name', 'student_detail', 'group_name', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    marked_by_name = serializers.CharField(source='marked_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'group', 'group_name',
            'date', 'is_present', 'marked_by', 'marked_by_name',
            'photo', 'note',
        ]
        read_only_fields = ['id']


class HomeworkSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default=None)
    submissions_count = serializers.SerializerMethodField()
    submitted = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    answer_text = serializers.SerializerMethodField()

    class Meta:
        model = Homework
        fields = [
            'id', 'group', 'group_name', 'title', 'description', 'due_date',
            'created_by', 'created_by_name', 'submissions_count',
            'submitted', 'grade', 'feedback', 'answer_text', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def _requested_student_id(self):
        request = self.context.get('request')
        if not request:
            return None
        student_param = request.query_params.get('student')
        if student_param:
            try:
                return int(student_param)
            except (TypeError, ValueError):
                return None
        user = getattr(request, 'user', None)
        if user and getattr(user, 'role', None) == 'oquvchi':
            return user.id
        return None

    def get_submissions_count(self, obj):
        return obj.submissions.count()

    def _submission(self, obj):
        sid = self._requested_student_id()
        if not sid:
            return None
        return obj.submissions.filter(student_id=sid).first()

    def get_submitted(self, obj):
        return self._submission(obj) is not None

    def get_grade(self, obj):
        sub = self._submission(obj)
        return sub.grade if sub else None

    def get_feedback(self, obj):
        sub = self._submission(obj)
        return sub.feedback if sub else None

    def get_answer_text(self, obj):
        sub = self._submission(obj)
        return sub.answer_text if sub else None


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    homework_title = serializers.CharField(source='homework.title', read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = [
            'id', 'homework', 'homework_title', 'student', 'student_name',
            'file', 'answer_text', 'submitted_at', 'grade', 'feedback',
        ]
        read_only_fields = ['id', 'submitted_at']


class LessonSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True, default=None)

    class Meta:
        model = Lesson
        fields = [
            'id', 'group', 'group_name', 'topic', 'description', 'date',
            'teacher', 'teacher_name', 'room', 'materials_text',
        ]
        read_only_fields = ['id']
