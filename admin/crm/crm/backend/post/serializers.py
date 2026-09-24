from rest_framework import serializers
from .models import Post, PostComment, PostLike


class PostCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = PostComment
        fields = ['id', 'post', 'author', 'author_name', 'content', 'created_at']
        # author — serverda request.user dan olinadi
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        return (obj.author.get_full_name() or obj.author.username) if obj.author_id else ''


class PostLikeSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = PostLike
        fields = ['id', 'post', 'user', 'user_name', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    target_audience_display = serializers.CharField(source='get_target_audience_display', read_only=True)
    last_comments = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_name', 'title', 'content', 'image',
            'target_audience', 'target_audience_display',
            'likes_count', 'comments_count', 'last_comments', 'is_liked',
            'created_at', 'updated_at',
        ]
        # author serverda request.user dan to'ldiriladi (perform_create)
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        return (obj.author.get_full_name() or obj.author.username) if obj.author_id else ''

    def get_last_comments(self, obj):
        comments = obj.post_comments.select_related('author')[:3]
        return PostCommentSerializer(comments, many=True, context=self.context).data

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PostLike.objects.filter(post=obj, user=request.user).exists()
        return False


class PostDetailSerializer(PostSerializer):
    post_comments = PostCommentSerializer(many=True, read_only=True)

    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['post_comments']
