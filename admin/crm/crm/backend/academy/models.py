from django.db import models
from django.conf import settings
from accounts.models import SUBJECT_CHOICES


class Group(models.Model):
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='taught_groups',
        limit_choices_to={'role__in': ['ustoz', 'qowimcha_ustoz']},
    )
    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kurator_groups',
        limit_choices_to={'role': 'kurator'},
    )
    room = models.CharField(max_length=50, blank=True, default='')
    schedule = models.TextField(blank=True, default='')
    max_students = models.PositiveIntegerField(default=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_subject_display()})"

    @property
    def current_students_count(self):
        return self.group_students.filter(is_active=True).count()

    @property
    def is_full(self):
        return self.current_students_count >= self.max_students


class GroupStudent(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='group_students')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_groups',
        limit_choices_to={'role': 'oquvchi'},
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('group', 'student')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.student.get_full_name()} in {self.group.name}"


class AdditionalTeacherStudent(models.Model):
    WEEKDAY_CHOICES = [
        (1, 'Dushanba'),
        (2, 'Seshanba'),
        (3, 'Chorshanba'),
        (4, 'Payshanba'),
        (5, 'Juma'),
        (6, 'Shanba'),
        (7, 'Yakshanba'),
    ]

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='additional_students',
        limit_choices_to={'role': 'qowimcha_ustoz'},
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='additional_teachers',
        limit_choices_to={'role': 'oquvchi'},
    )
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES, blank=True, default='')
    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES)
    time = models.CharField(max_length=20, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'student', 'weekday')
        ordering = ['weekday']

    def __str__(self):
        return f"{self.student.get_full_name()} -> {self.teacher.get_full_name()} ({self.get_weekday_display()})"


class TutorSession(models.Model):
    """Qo'shimcha ustoz uchun dars sessiyasi: boshlash va tugatish."""
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_sessions',
        limit_choices_to={'role': 'qowimcha_ustoz'},
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_registration_sessions',
        limit_choices_to={'role': 'oquvchi'},
    )
    date = models.DateField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.get_full_name()} -> {self.teacher.get_full_name()} ({self.date})"


class Attendance(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendances',
    )
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    is_present = models.BooleanField(default=False)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendances',
    )
    photo = models.ImageField(upload_to='attendance/', blank=True, null=True)
    note = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('student', 'group', 'date')
        ordering = ['-date']

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student.get_full_name()} - {self.group.name} - {self.date} ({status})"


class Homework(models.Model):
    # Guruh va muddat endi ixtiyoriy: faqat sarlavha + matn bilan ham
    # umumiy uy vazifasi yaratish mumkin (guruhsiz = barcha guruhlar uchun).
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name='homeworks', null=True, blank=True
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_homeworks',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.group.name if self.group else 'Barcha guruhlar'}"


class HomeworkSubmission(models.Model):
    homework = models.ForeignKey(Homework, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='homework_submissions',
    )
    file = models.FileField(upload_to='homework_submissions/', blank=True, null=True)
    answer_text = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    grade = models.PositiveIntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('homework', 'student')
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.homework.title}"


class Lesson(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='lessons')
    topic = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    date = models.DateField()
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='lessons_taught',
    )
    room = models.CharField(max_length=50, blank=True, default='')
    materials_text = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.topic} - {self.group.name} ({self.date})"
