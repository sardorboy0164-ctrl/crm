from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, ParentStudent, TeacherSubject, Notification


class UserSerializer(serializers.ModelSerializer):
    is_online = serializers.BooleanField(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Rolni faqat admin o'zgartira oladi — boshqalarda role o'qiluvchi maydon.
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not (user and user.is_authenticated and user.role == 'admin'):
            self.fields['role'].read_only = True

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'avatar', 'coin_balance', 'date_of_birth',
            'is_approved', 'approved_at', 'last_seen', 'is_online',
            'created_at', 'is_active',
        ]
        read_only_fields = ['id', 'coin_balance', 'created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone', 'date_of_birth',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        # Ro'yxatdan o'tishda rol tanlanmaydi — faqat admin yaratayotganda
        # kiritilgan rol qabul qilinadi, aks holda default 'oquvchi' bo'ladi.
        request = self.context.get('request')
        requester = getattr(request, 'user', None)
        if not (requester and requester.is_authenticated and requester.role == 'admin'):
            validated_data.pop('role', None)

        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class AdminResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, min_length=6)


class ParentStudentSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.get_full_name', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = ParentStudent
        fields = ['id', 'parent', 'student', 'parent_name', 'student_name']
        read_only_fields = ['id']


class TeacherSubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    subject_display = serializers.CharField(source='get_subject_display', read_only=True)

    class Meta:
        model = TeacherSubject
        fields = ['id', 'teacher', 'subject', 'teacher_name', 'subject_display']
        read_only_fields = ['id']


class NotificationSerializer(serializers.ModelSerializer):
    from_user_name = serializers.CharField(source='from_user.get_full_name', read_only=True, default='')
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'notification_type', 'notification_type_display',
            'title', 'message', 'from_user', 'from_user_name',
            'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
