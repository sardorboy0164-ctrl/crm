from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from .models import User, ParentStudent, TeacherSubject, Notification
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    ChangePasswordSerializer, AdminResetPasswordSerializer,
    ParentStudentSerializer,
    TeacherSubjectSerializer, NotificationSerializer,
)


class IsAdminRole(permissions.BasePermission):
    """Faqat role='admin' foydalanuvchi uchun ruxsat."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role == 'admin'
        )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['created_at', 'username', 'coin_balance']

    def get_permissions(self):
        # Yaratish / o'zgartirish / ochirish — faqat admin uchun.
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get', 'put', 'patch'])
    def profile(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})

    @action(detail=False, methods=['get'])
    def teachers(self, request):
        teachers = User.objects.filter(role__in=['ustoz', 'qowimcha_ustoz'])
        serializer = UserSerializer(teachers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def students(self, request):
        students = User.objects.filter(role='oquvchi')
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def parents(self, request):
        parents = User.objects.filter(role='ota_ona')
        serializer = UserSerializer(parents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='distribute-coins')
    def distribute_coins(self, request):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        amount = request.data.get('amount', 10)
        role = request.data.get('role', 'oquvchi')
        users = User.objects.filter(role=role, is_active=True)
        count = 0
        for user in users:
            user.coin_balance += int(amount)
            user.save()
            count += 1
        return Response({'detail': f'{count} ta foydalanuvchiga {amount} coin taqsimlandi.'})

    @action(detail=True, methods=['post'], url_path='assign-group')
    def assign_group(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        group_id = request.data.get('group_id')
        if not group_id:
            return Response({'detail': 'group_id kiritilishi shart.'}, status=status.HTTP_400_BAD_REQUEST)
        from academy.models import Group, GroupStudent
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({'detail': 'Guruh topilmadi.'}, status=status.HTTP_404_NOT_FOUND)
        gs, created = GroupStudent.objects.get_or_create(group=group, student=user)
        if not created:
            return Response({'detail': 'Bu o\'quvchi allaqacha shu guruhda.'})
        return Response({'detail': f'{user.get_full_name()} -> {group.name} guruhiga qo\'shildi.'})

    @action(detail=True, methods=['post'], url_path='admin-reset-password')
    def admin_reset_password(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': f'{user.get_full_name()} paroli yangilandi.'})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_approved=False)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        role = request.data.get('role')
        if role and role in dict(User.ROLE_CHOICES):
            user.role = role
        user.is_approved = True
        user.approved_at = timezone.now()
        user.save()
        return Response({'detail': f'{user.get_full_name()} tasdiqlandi.', 'user': UserSerializer(user).data})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'detail': 'Faqat admin mumkin.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_approved = False
        user.is_active = False
        user.save()
        return Response({'detail': f'{user.get_full_name()} bekor qilindi.'})

    @action(detail=False, methods=['post'])
    def heartbeat(self, request):
        if request.user.is_authenticated:
            request.user.last_seen = timezone.now()
            request.user.save(update_fields=['last_seen'])
        return Response({'detail': 'ok', 'is_online': True})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    # Kontekst uzatiladi: admin panelidan yaratilganda rol qabul qilinadi,
    # oddiy ro'yxatdan o'tishda esa rol e'tiborsga olinadi (default: oquvchi).
    serializer = UserCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    user.is_approved = False
    user.save(update_fields=['is_approved'])

    admins = User.objects.filter(role='admin', is_active=True)
    for admin in admins:
        Notification.objects.create(
            recipient=admin,
            notification_type='registration',
            title='Yangi ro\'yxatdan o\'tish',
            message=f'{user.get_full_name()} ({user.username}) tizimga ro\'yxatdan o\'tdi. Rol: {user.get_role_display()}.',
            from_user=user,
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    user.auto_approve_if_week_passed()
    user.last_seen = timezone.now()
    user.save(update_fields=['last_seen'])
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    })


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_read', 'notification_type']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'detail': 'O\'qilgan deb belgilandi.'})

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'Barcha bildirishnomalar o\'qilgan deb belgilandi.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})


class ParentStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ParentStudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['parent', 'student']
    search_fields = ['parent__username', 'student__username']

    def get_queryset(self):
        user = self.request.user
        qs = ParentStudent.objects.select_related('parent', 'student')
        # Ota-ona faqat o'z farzandlarini ko'rishi shart — boshqa ota-onalarning
        # bolalari ham ochiq ko'rinib qolayotgan edi.
        if user.is_authenticated and user.role not in ('admin',):
            qs = qs.filter(parent=user)
        return qs

    def perform_create(self, serializer):
        if self.request.user.is_authenticated and self.request.user.role == 'ota_ona':
            serializer.save(parent=self.request.user)
        else:
            serializer.save()


class TeacherSubjectViewSet(viewsets.ModelViewSet):
    queryset = TeacherSubject.objects.select_related('teacher').all()
    serializer_class = TeacherSubjectSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['teacher', 'subject']
