from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Conversation.objects.none()
        if user.role == 'qowimcha_ustoz':
            return Conversation.objects.none()
        return Conversation.objects.filter(participants=user).distinct().prefetch_related('participants')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=False, methods=['post'], url_path='start-parent-chat')
    def start_parent_chat(self, request):
        """O'quvchi tanlasa ustoz + ota-ona + kurator ishtirokida suhbat ochiladi."""
        allowed_roles = {'ustoz', 'kurator', 'admin'}
        if request.user.role not in allowed_roles:
            return Response({'error': 'Sizga suhbat ochish ruxsati yo\'q.'}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id kiritilishi shart.'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User
        from academy.models import GroupStudent

        try:
            student = User.objects.get(id=student_id, role='oquvchi')
        except User.DoesNotExist:
            return Response({'error': 'O\'quvchi topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        participant_ids = {request.user.id}
        participant_ids.update(student.parents.values_list('parent_id', flat=True))

        group_links = GroupStudent.objects.filter(student=student, is_active=True).select_related('group__kurator')
        for link in group_links:
            if link.group.kurator_id:
                participant_ids.add(link.group.kurator_id)

        if len(participant_ids) < 2:
            return Response(
                {'error': 'Bu o\'quvchining ota-onasi tizimda bog\'lanmagan. Avval ota-onani bog\'lang.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation = None
        for conv in request.user.conversations.prefetch_related('participants'):
            ids = set(conv.participants.values_list('id', flat=True))
            if ids == participant_ids:
                conversation = conv
                break

        if conversation is None:
            conversation = Conversation.objects.create()
            conversation.participants.set(User.objects.filter(id__in=participant_ids))

        return Response(ConversationSerializer(conversation, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['post'], url_path='start-kurator-chat')
    def start_kurator_chat(self, request):
        """Ota-ona o'z farzandi kuratori bilan suhbat ochadi (kurator ishtirokida)."""
        if request.user.role != 'ota_ona':
            return Response({'error': 'Sizga suhbat ochish ruxsati yo\'q.'}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id kiritilishi shart.'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User, ParentStudent
        from academy.models import GroupStudent

        if not ParentStudent.objects.filter(parent=request.user, student_id=student_id).exists():
            return Response({'error': 'Bu o\'quvchi sizning farzandingiz emas.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = User.objects.get(id=student_id, role='oquvchi')
        except User.DoesNotExist:
            return Response({'error': 'O\'quvchi topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        participant_ids = {request.user.id, student_id}
        group_links = GroupStudent.objects.filter(student=student, is_active=True).select_related('group__kurator')
        for link in group_links:
            if link.group.kurator_id:
                participant_ids.add(link.group.kurator_id)

        if len(participant_ids) < 2:
            return Response(
                {'error': 'Bu o\'quvchiga kurator tayinlanmagan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation = None
        for conv in request.user.conversations.prefetch_related('participants'):
            ids = set(conv.participants.values_list('id', flat=True))
            if ids == participant_ids:
                conversation = conv
                break

        if conversation is None:
            conversation = Conversation.objects.create()
            conversation.participants.set(User.objects.filter(id__in=participant_ids))

        return Response(ConversationSerializer(conversation, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        qs = conversation.messages.select_related('sender')
        serializer = MessageSerializer(qs, many=True)
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        conversation = self.get_object()
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Xabar matni bo\'sh bo\'lmasin.'}, status=status.HTTP_400_BAD_REQUEST)
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text,
        )
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        if request.user.role == 'qowimcha_ustoz':
            return Response({'count': 0})
        count = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False,
        ).exclude(sender=request.user).distinct().count()
        return Response({'count': count})