from django.contrib import admin
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'text', 'created_at')


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'participants_list', 'updated_at', 'created_at')
    search_fields = ('participants__first_name', 'participants__last_name', 'participants__username')

    def participants_list(self, obj):
        return ', '.join(p.get_full_name() for p in obj.participants.all())
    participants_list.short_description = 'Ishtirokchilar'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'sender', 'text', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('text', 'sender__username')