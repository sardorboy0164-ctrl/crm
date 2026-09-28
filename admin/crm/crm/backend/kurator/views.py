from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from .models import KuratorPhoto, KuratorReport, StudentStatus, Room, StudentGrade
from .serializers import KuratorPhotoSerializer, KuratorReportSerializer, StudentStatusSerializer, RoomSerializer, StudentGradeSerializer


class KuratorPhotoViewSet(viewsets.ModelViewSet):
    queryset = KuratorPhoto.objects.select_related('kurator', 'group').prefetch_related('students_present').all()
    serializer_class = KuratorPhotoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['kurator', 'group', 'date']
    search_fields = ['description', 'lesson_topic']
    ordering_fields = ['date']

    def get_queryset(self):
        user = self.request.user
        qs = KuratorPhoto.objects.select_related('kurator', 'group').prefetch_related('students_present')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'kurator':
            return qs.filter(kurator=user)
        if user.role == 'ota_ona':
            # Ota-ona faqat o'z farzandlari o'qiyotgan guruh suratlarini ko'rishi mumkin.
            my_students = user.children.values_list('student_id', flat=True)
            from academy.models import GroupStudent
            my_group_ids = GroupStudent.objects.filter(
                student_id__in=my_students, is_active=True
            ).values_list('group_id', flat=True)
            return qs.filter(group_id__in=my_group_ids)
        return qs

    def perform_create(self, serializer):
        serializer.save(kurator=self.request.user)

    @action(detail=False, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request):
        if request.user.role not in ('kurator', 'admin'):
            return Response({'error': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)
        kurator = request.user if request.user.role == 'kurator' else request.data.get('kurator')
        serializer = KuratorPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(kurator=kurator)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-photos')
    def my_photos(self, request):
        photos = KuratorPhoto.objects.filter(kurator=request.user).select_related('group').prefetch_related('students_present')
        serializer = KuratorPhotoSerializer(photos, many=True)
        return Response(serializer.data)


class KuratorReportViewSet(viewsets.ModelViewSet):
    queryset = KuratorReport.objects.select_related('kurator').prefetch_related('groups_covered').all()
    serializer_class = KuratorReportSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['kurator', 'date']
    ordering_fields = ['date']

    def perform_create(self, serializer):
        serializer.save(kurator=self.request.user)

    @action(detail=False, methods=['get'], url_path='my-reports')
    def my_reports(self, request):
        reports = KuratorReport.objects.filter(kurator=request.user).prefetch_related('groups_covered')
        serializer = KuratorReportSerializer(reports, many=True)
        return Response(serializer.data)


class StudentStatusViewSet(viewsets.ModelViewSet):
    queryset = StudentStatus.objects.select_related('kurator', 'student').all()
    serializer_class = StudentStatusSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['student', 'kurator', 'status']
    ordering_fields = ['created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = StudentStatus.objects.select_related('kurator', 'student')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'kurator':
            return qs.filter(kurator=user)
        if user.role == 'ota_ona':
            my_students = user.children.values_list('student_id', flat=True)
            return qs.filter(student_id__in=my_students)
        if user.role == 'oquvchi':
            return qs.filter(student=user)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('kurator', 'admin'):
            raise permissions.PermissionDenied('Faqat kurator yoki admin belgilay oladi.')
        instance = serializer.save(kurator=self.request.user)
        return instance

    @action(detail=False, methods=['get'], url_path='my-students')
    def my_students(self, request):
        """Kurator o'z guruhlaridagi barcha o'quvchilar ro'yxati va ularning holatini qaytaradi."""
        if request.user.role not in ('kurator', 'admin'):
            return Response({'error': 'Ruxsat yo\'q.'}, status=status.HTTP_403_FORBIDDEN)
        from accounts.models import User
        from academy.models import Group, GroupStudent
        group_qs = Group.objects.filter(kurator=request.user) if request.user.role == 'kurator' else Group.objects.all()
        student_ids = set(GroupStudent.objects.filter(group__in=group_qs, is_active=True).values_list('student_id', flat=True))
        students = User.objects.filter(id__in=student_ids, role='oquvchi')
        latest_statuses = {
            s.student_id: s
            for s in StudentStatus.objects.filter(student_id__in=student_ids).order_by('-created_at')
        }
        data = []
        for stud in students:
            st = latest_statuses.get(stud.id)
            data.append({
                'id': stud.id,
                'first_name': stud.first_name,
                'last_name': stud.last_name,
                'username': stud.username,
                'avatar': stud.avatar.url if stud.avatar else None,
                'status': st.status if st else None,
                'comment': st.comment if st else '',
                'status_updated_at': st.updated_at if st else None,
            })
        return Response(data)
