from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Post, PostComment, PostLike
from .serializers import (
    PostSerializer, PostDetailSerializer,
    PostCommentSerializer, PostLikeSerializer,
)


class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['author', 'target_audience']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'updated_at']

    def get_queryset(self):
        qs = Post.objects.select_related('author')
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'admin':
            return qs
        # Foydalanuvchi o'z roliga mos keladigan postlarni ham, hammaga
        # mo'ljallanganlarni ham ko'radi (eski lotin qadriyatlarini ham hisobga olib).
        role_map = {'oquvchi': 'oquvchi', 'ustoz': 'ustoz', 'qowimcha_ustoz': 'ustoz',
                    'ota_ona': 'ota_ona', 'kurator': 'kurator', 'intern': 'intern'}
        audience = role_map.get(user.role, 'all')
        return qs.filter(
            Q(target_audience='all')
            | Q(target_audience=audience)
            | Q(target_audience__in=['students', 'teachers', 'parents'])
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': post.likes_count})
        return Response({'liked': True, 'likes_count': post.likes_count}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        comments = PostComment.objects.filter(post=post).select_related('author')
        serializer = PostCommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        post = self.get_object()
        content = request.data.get('content')
        if not content:
            return Response({'error': 'Content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = PostComment.objects.create(
            post=post,
            author=request.user,
            content=content,
        )
        return Response(PostCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class PostCommentViewSet(viewsets.ModelViewSet):
    queryset = PostComment.objects.select_related('author', 'post').all()
    serializer_class = PostCommentSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['post', 'author']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostLikeViewSet(viewsets.ModelViewSet):
    queryset = PostLike.objects.select_related('user', 'post').all()
    serializer_class = PostLikeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['post', 'user']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
