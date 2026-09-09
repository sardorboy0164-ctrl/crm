from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date
from django.utils import timezone

from .models import (
    Group, GroupStudent, Attendance, Homework, HomeworkSubmission, Lesson,
    AdditionalTeacherStudent, TutorSession,
)
from .serializers import (
    GroupSerializer, GroupStudentSerializer, AttendanceSerializer,
    HomeworkSerializer, HomeworkSubmissionSerializer, LessonSerializer,
    AdditionalTeacherStudentSerializer,
)
from accounts.serializers import UserSerializer


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'teacher', 'kurator']
    search_fields = ['name', 'room']
    ordering_fields = ['created_at', 'name']

    def get_queryset(self):
        user = self.request.user
        qs = Group.objects.select_related('teacher', 'kurator')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'oquvchi':
            return qs.filter(
                group_students__student=user,
                group_students__is_active=True,
            ).distinct()
        if user.role == 'ota_ona':
            child_ids = user.children.values_list('student_id', flat=True)
            return qs.filter(
                group_students__student_id__in=child_ids,
                group_students__is_active=True,
            ).distinct()
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(teacher=user)
        if user.role == 'kurator':
            return qs.filter(kurator=user)
        return qs

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        group = self.get_object()
        students = GroupStudent.objects.filter(group=group, is_active=True).select_related('student')
        serializer = GroupStudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_student(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if group.is_full:
            return Response({'error': 'Group is full.'}, status=status.HTTP_400_BAD_REQUEST)

        gs, created = GroupStudent.objects.get_or_create(
            group=group, student_id=student_id,
            defaults={'is_active': True}
        )
        if not created:
            gs.is_active = True
            gs.save()
        return Response(GroupStudentSerializer(gs).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_student(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gs = GroupStudent.objects.get(group=group, student_id=student_id)
            gs.is_active = False
            gs.save()
            return Response({'detail': 'Student removed from group.'})
        except GroupStudent.DoesNotExist:
            return Response({'error': 'Student not in group.'}, status=status.HTTP_404_NOT_FOUND)


class GroupStudentViewSet(viewsets.ModelViewSet):
    serializer_class = GroupStudentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['group', 'student', 'is_active']

    def get_queryset(self):
        user = self.request.user
        qs = GroupStudent.objects.select_related('group', 'student')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'oquvchi':
            return qs.filter(student=user)
        if user.role == 'ota_ona':
            child_ids = user.children.values_list('student_id', flat=True)
            return qs.filter(student_id__in=child_ids)
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(group__teacher=user)
        if user.role == 'kurator':
            return qs.filter(group__kurator=user)
        return qs


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['student', 'group', 'date', 'is_present']
    ordering_fields = ['date']

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('student', 'group', 'marked_by')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'oquvchi':
            return qs.filter(student=user)
        if user.role == 'ota_ona':
            # Ota-ona faqat o'z farzandlari hisobotini ko'radi.
            child_ids = user.children.values_list('student_id', flat=True)
            return qs.filter(student_id__in=child_ids)
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(group__teacher=user)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        attendances_data = request.data.get('attendances', [])
        if not attendances_data:
            return Response({'error': 'attendances list is required.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for data in attendances_data:
            serializer = AttendanceSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(marked_by=request.user)
            created.append(serializer.data)

        return Response(created, status=status.HTTP_201_CREATED)


class HomeworkViewSet(viewsets.ModelViewSet):
    serializer_class = HomeworkSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['group', 'created_by', 'due_date']
    search_fields = ['title']
    ordering_fields = ['created_at', 'due_date']

    def get_queryset(self):
        user = self.request.user
        qs = Homework.objects.select_related('group', 'created_by')
        if not user.is_authenticated:
            return qs.none()

        # Manual `student` parametri: ota-ona tug'ri murojaat qilganda bitta
        # farzandining uy vazifalarini oladi. Faqat ota-onaga ruxsat.
        student_param = self.request.query_params.get('student')
        if user.role == 'ota_ona' and student_param:
            child_ids = list(user.children.values_list('student_id', flat=True))
            try:
                student_id = int(student_param)
            except (TypeError, ValueError):
                student_id = None
            if student_id in child_ids:
                group_ids = GroupStudent.objects.filter(
                    student_id=student_id, is_active=True
                ).values_list('group_id', flat=True)
                return qs.filter(group_id__in=group_ids)

        if user.role == 'oquvchi':
            group_ids = GroupStudent.objects.filter(
                student=user, is_active=True
            ).values_list('group_id', flat=True)
            return qs.filter(group_id__in=group_ids)
        if user.role == 'ota_ona':
            child_ids = user.children.values_list('student_id', flat=True)
            group_ids = GroupStudent.objects.filter(
                student_id__in=child_ids, is_active=True
            ).values_list('group_id', flat=True)
            return qs.filter(group_id__in=group_ids)
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(group__teacher=user)
        return qs

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        homework = self.get_object()
        subs = HomeworkSubmission.objects.filter(homework=homework).select_related('student')
        serializer = HomeworkSubmissionSerializer(subs, many=True)
        return Response(serializer.data)


class HomeworkSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = HomeworkSubmissionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['homework', 'student', 'grade']

    def get_queryset(self):
        user = self.request.user
        qs = HomeworkSubmission.objects.select_related('homework', 'student')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'oquvchi':
            return qs.filter(student=user)
        if user.role == 'ota_ona':
            child_ids = user.children.values_list('student_id', flat=True)
            return qs.filter(student_id__in=child_ids)
        if user.role in ('ustoz', 'qowimcha_ustoz'):
            return qs.filter(homework__group__teacher=user)
        return qs


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related('group', 'teacher').all()
    serializer_class = LessonSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['group', 'teacher', 'date']
    search_fields = ['topic']
    ordering_fields = ['date']


class AdditionalTeacherStudentViewSet(viewsets.ModelViewSet):
    serializer_class = AdditionalTeacherStudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['teacher', 'student', 'weekday', 'is_active']
    search_fields = ['student__first_name', 'student__last_name', 'teacher__first_name', 'teacher__last_name']
    ordering_fields = ['weekday', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = AdditionalTeacherStudent.objects.select_related('teacher', 'student')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'admin':
            return qs
        if user.role == 'qowimcha_ustoz':
            return qs.filter(teacher=user)
        if user.role == 'ustoz':
            return qs.filter(student__student_groups__group__teacher=user).distinct()
        if user.role == 'kurator':
            return qs.filter(student__student_groups__group__kurator=user).distinct()
        return qs

    @action(detail=False, methods=['get'], url_path='my-students')
    def my_students(self, request):
        """Qo'shimcha ustozga yozilgan o'quvchilar.

        Qo'shimcha ustoz o'ziga yozilgan BARCHA o'quvchilarni ko'radi
        (hafta kunidan qat'iy nazar), har biri bilan kuni/soati/mavzusi bilan.
        """
        user = request.user
        today_weekday = date.today().isoweekday()
        today = date.today()

        if user.role == 'qowimcha_ustoz':
            qs = AdditionalTeacherStudent.objects.filter(
                teacher=user, is_active=True
            )
            schedule_filter = False
        elif user.role == 'ustoz':
            qs = AdditionalTeacherStudent.objects.filter(
                is_active=True, weekday=today_weekday,
                student__student_groups__group__teacher=user,
            ).distinct()
            schedule_filter = True
        elif user.role == 'kurator':
            qs = AdditionalTeacherStudent.objects.filter(
                is_active=True, weekday=today_weekday,
                student__student_groups__group__kurator=user,
            ).distinct()
            schedule_filter = True
        elif user.role == 'admin':
            qs = AdditionalTeacherStudent.objects.filter(is_active=True)
            schedule_filter = False
        else:
            return Response({'detail': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)

        qs = qs.select_related('student').prefetch_related(
            'student__student_groups__group'
        )
        data = []
        for ass in qs:
            groups = [
                g.group for g in ass.student.student_groups.filter(is_active=True)
            ]
            lessons = Lesson.objects.filter(
                date=today, group__in=groups
            ).select_related('group', 'teacher')
            data.append({
                'id': ass.id,
                'weekday': ass.weekday,
                'weekday_display': ass.get_weekday_display(),
                'time': ass.time,
                'subject': ass.subject,
                'subject_display': ass.get_subject_display() if ass.subject else ass.subject,
                'is_today': ass.weekday == today_weekday,
                'student': {
                    'id': ass.student.id,
                    'first_name': ass.student.first_name,
                    'last_name': ass.student.last_name,
                    'username': ass.student.username,
                    'phone': ass.student.phone,
                    'avatar': ass.student.avatar.url if ass.student.avatar else None,
                    'is_online': ass.student.is_online,
                },
                'groups': [
                    {'id': g.id, 'name': g.name, 'room': g.room}
                    for g in groups
                ],
                'lessons': [
                    {
                        'id': l.id,
                        'topic': l.topic,
                        'time': l.date.isoformat(),
                        'room': l.room,
                        'group_name': l.group.name,
                        'teacher_name': l.teacher.get_full_name() if l.teacher else '',
                    }
                    for l in lessons
                ],
            })
        return Response(data)

    @action(detail=False, methods=['get'], url_path='available-teachers')
    def available_teachers(self, request):
        """O'quvchi uchun: qo'shimcha ustozlar va ularning bo'sh vaqtlari.

        Band qilingan (boshqa o'quvchi yozilgan) vaqt ko'rsatilmaydi.
        """
        if request.user.role != 'oquvchi':
            return Response({'detail': 'Faqat o\'quvchi mumkin.'}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import User
        from .models import AdditionalTeacherStudent as ATS

        teachers = User.objects.filter(role='qowimcha_ustoz', is_active=True)
        active = list(ATS.objects.filter(is_active=True).select_related('teacher'))
        taken = set((a.teacher_id, a.weekday, a.time) for a in active)

        result = []
        for t in teachers:
            taken_slots = set((a.weekday, a.time) for a in active if a.teacher_id == t.id)
            result.append({
                'id': t.id,
                'first_name': t.first_name,
                'last_name': t.last_name,
                'username': t.username,
                'phone': t.phone,
                'subjects': list(t.teacher_subjects.values_list('subject', flat=True)),
                'taken_slots': [
                    {'weekday': w, 'time': ti} for (w, ti) in taken_slots
                ],
            })
        return Response(result)

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """O'quvchining o'zini qo'shimcha ustozga yozdirishi."""
        if request.user.role != 'oquvchi':
            return Response({'detail': 'Faqat o\'quvchi mumkin.'}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import User
        from .models import AdditionalTeacherStudent as ATS

        teacher_id = request.data.get('teacher_id')
        weekday = request.data.get('weekday')
        time = (request.data.get('time') or '').strip()
        subject = request.data.get('subject', '')

        try:
            weekday = int(weekday)
        except (TypeError, ValueError):
            return Response({'error': 'weekday to\'g\'ri kiritilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if not time:
            return Response({'error': 'Vaqt (time) kiritilishi shart.'}, status=status.HTTP_400_BAD_REQUEST)
        if weekday not in dict(ATS.WEEKDAY_CHOICES):
            return Response({'error': 'Noto\'g\'ri hafta kuni.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            teacher = User.objects.get(id=teacher_id, role='qowimcha_ustoz')
        except User.DoesNotExist:
            return Response({'error': 'Qo\'shimcha ustoz topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        slot_taken = ATS.objects.filter(
            teacher=teacher, weekday=weekday, time=time, is_active=True
        ).exists()
        if slot_taken:
            return Response(
                {'error': 'Bu vaqt allaqachon band. Boshqa vaqt tanlang.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reg, created = ATS.objects.get_or_create(
            teacher=teacher,
            student=request.user,
            defaults={'weekday': weekday, 'time': time, 'subject': subject, 'is_active': True},
        )
        if not created:
            reg.weekday = weekday
            reg.time = time
            reg.subject = subject
            reg.is_active = True
            reg.save()

        return Response(AdditionalTeacherStudentSerializer(reg).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-registrations')
    def my_registrations(self, request):
        """O'quvchining o'z yozilishlari."""
        qs = AdditionalTeacherStudent.objects.filter(
            student=request.user, is_active=True
        ).select_related('teacher')
        data = [
            {
                'id': a.id,
                'teacher_id': a.teacher_id,
                'teacher_name': a.teacher.get_full_name(),
                'weekday': a.weekday,
                'weekday_display': a.get_weekday_display(),
                'time': a.time,
                'subject': a.subject,
                'subject_display': a.get_subject_display(),
            }
            for a in qs
        ]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='salary')
    def salary(self, request):
        """Qo'shimcha ustozning oyligi.

        Baza: 3,000,000 som. Har 50 ta yozilgan o'quvchi uchun +500,000 som.
        """
        if request.user.role != 'qowimcha_ustoz':
            return Response({'detail': 'Faqat qo\'shimcha ustoz mumkin.'}, status=status.HTTP_403_FORBIDDEN)

        students_count = AdditionalTeacherStudent.objects.filter(
            teacher=request.user, is_active=True
        ).values('student').distinct().count()

        extra_blocks = students_count // 50
        salary = 3_000_000 + extra_blocks * 500_000

        return Response({
            'students_count': students_count,
            'base_salary': 3_000_000,
            'bonus_per_block': 500_000,
            'extra_blocks': extra_blocks,
            'salary': salary,
        })

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        """Qo'shimcha ustoz darsni boshlaydi."""
        if request.user.role != 'qowimcha_ustoz':
            return Response({'detail': 'Faqat qo\'shimcha ustoz mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        reg = self.get_object()
        if reg.teacher_id != request.user.id:
            return Response({'detail': 'Bu sizning o\'quvchingiz emas.'}, status=status.HTTP_403_FORBIDDEN)

        today = date.today()
        session, created = TutorSession.objects.get_or_create(
            teacher=request.user,
            student=reg.student,
            date=today,
            defaults={'started_at': timezone.now()},
        )
        if not created and session.started_at:
            return Response({'detail': 'Dars allaqachon boshlangan.'}, status=status.HTTP_400_BAD_REQUEST)
        if not session.started_at:
            session.started_at = timezone.now()
            session.save()

        return Response({
            'id': session.id,
            'student_id': session.student_id,
            'student_name': session.student.get_full_name(),
            'started_at': session.started_at,
            'ended_at': session.ended_at,
        })

    @action(detail=True, methods=['post'], url_path='end-session')
    def end_session(self, request, pk=None):
        """Qo'shimcha ustoz darsni tugatadi."""
        if request.user.role != 'qowimcha_ustoz':
            return Response({'detail': 'Faqat qo\'shimcha ustoz mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        reg = self.get_object()
        if reg.teacher_id != request.user.id:
            return Response({'detail': 'Bu sizning o\'quvchingiz emas.'}, status=status.HTTP_403_FORBIDDEN)

        today = date.today()
        session = TutorSession.objects.filter(
            teacher=request.user, student=reg.student, date=today
        ).first()
        if not session or not session.started_at:
            return Response({'detail': 'Dars boshlanmagan.'}, status=status.HTTP_400_BAD_REQUEST)

        session.ended_at = timezone.now()
        session.save()
        return Response({
            'id': session.id,
            'student_id': session.student_id,
            'student_name': session.student.get_full_name(),
            'started_at': session.started_at,
            'ended_at': session.ended_at,
        })

    @action(detail=True, methods=['get'], url_path='session-status')
    def session_status(self, request, pk=None):
        reg = self.get_object()
        if request.user.role == 'qowimcha_ustoz' and reg.teacher_id != request.user.id:
            return Response({'detail': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)
        today = date.today()
        session = TutorSession.objects.filter(
            teacher=reg.teacher, student=reg.student, date=today
        ).first()
        return Response({
            'started_at': session.started_at if session else None,
            'ended_at': session.ended_at if session else None,
            'status': 'done' if (session and session.ended_at) else ('started' if (session and session.started_at) else 'not_started'),
        })
