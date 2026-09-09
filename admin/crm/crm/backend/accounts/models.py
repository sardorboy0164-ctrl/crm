from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('kurator', 'Kurator'),
        ('ustoz', 'Ustoz'),
        ('qowimcha_ustoz', 'Qowimcha Ustoz'),
        ('intern', 'Intern'),
        ('oquvchi', 'Oquvchi'),
        ('ota_ona', 'Ota-Ona'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='oquvchi')
    phone = models.CharField(max_length=20, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    coin_balance = models.PositiveIntegerField(default=0)
    date_of_birth = models.DateField(blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_online(self):
        if not self.last_seen:
            return False
        return timezone.now() - self.last_seen < timedelta(minutes=5)

    def auto_approve_if_week_passed(self):
        """Bir hafta ichida admin tasdiqlamasa foydalanuvchi o'quvchi bo'lib qoladi."""
        if self.is_approved:
            return False
        if timezone.now() - self.created_at >= timedelta(days=7):
            self.is_approved = True
            self.approved_at = self.created_at
            self.save(update_fields=['is_approved', 'approved_at'])
            return True
        return False


SUBJECT_CHOICES = [
    ('ielts_7', 'IELTS 7+'),
    ('general_english', 'General English'),
    ('ingliz_tili', 'Ingliz Tili'),
    ('rus_tili', 'Rus tili'),
    ('arab_tili', 'Arab tili'),
    ('koreys_tili', 'Koreys tili'),
    ('turk_tili', 'Turk tili'),
    ('matematika', 'Matematika'),
    ('ozbek_tili', 'O\'zbek Tili'),
    ('fizika', 'Fizika'),
    ('kimyo', 'Kimyo'),
    ('biologiya', 'Biologiya'),
    ('tarix', 'Tarix'),
]


class ParentStudent(models.Model):
    parent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='children',
        limit_choices_to={'role': 'ota_ona'}
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='parents',
        limit_choices_to={'role': 'oquvchi'}
    )

    class Meta:
        unique_together = ('parent', 'student')
        verbose_name = 'Parent-Student'
        verbose_name_plural = 'Parent-Student Links'

    def __str__(self):
        return f"{self.parent.get_full_name()} -> {self.student.get_full_name()}"


class TeacherSubject(models.Model):
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='teacher_subjects',
        limit_choices_to={'role__in': ['ustoz', 'qowimcha_ustoz']}
    )
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)

    class Meta:
        unique_together = ('teacher', 'subject')
        verbose_name = 'Teacher Subject'
        verbose_name_plural = 'Teacher Subjects'

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.get_subject_display()}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('registration', 'Yangi ro\'yxatdan o\'tish'),
        ('system', 'Tizim xabari'),
        ('assignment', 'Guruh tayinlash'),
    ]
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        limit_choices_to={'role': 'admin'},
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=200)
    message = models.TextField()
    from_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient.get_full_name()}"
