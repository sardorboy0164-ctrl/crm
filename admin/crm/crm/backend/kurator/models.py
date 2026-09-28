from django.db import models
from django.conf import settings


class KuratorPhoto(models.Model):
    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kurator_photos',
        limit_choices_to={'role': 'kurator'},
    )
    group = models.ForeignKey(
        'academy.Group',
        on_delete=models.CASCADE,
        related_name='kurator_photos',
    )
    photo = models.ImageField(upload_to='kurator_photos/', blank=True, null=True)
    description = models.TextField(blank=True, default='')
    date = models.DateField()
    students_present = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='photos_present',
    )
    lesson_topic = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Photo by {self.kurator.get_full_name()} - {self.group.name} ({self.date})"


class StudentStatus(models.Model):
    STATUS_CHOICES = [
        ('ijobiy', 'Ijobiy'),
        ('salbiy', 'Salbiy'),
    ]

    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='marked_statuses',
        limit_choices_to={'role': 'kurator'},
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_statuses',
        limit_choices_to={'role': 'oquvchi'},
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Student Status'
        verbose_name_plural = 'Student Statuses'

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.get_status_display()} ({self.kurator.get_full_name()})"


class Room(models.Model):
    """Kurator tomonidan boshqariladigan xona (sinf xonasi)."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    photo = models.ImageField(upload_to='rooms/', blank=True, null=True)
    capacity = models.PositiveIntegerField(default=20)
    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rooms',
        limit_choices_to={'role': 'kurator'},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.kurator.get_full_name()})"


class StudentGrade(models.Model):
    """Kurator o'quvchilarni baholash (1-5 yoki yaxshi/yomon)."""
    GRADE_CHOICES = [
        (1, '1 - Yomon'),
        (2, '2 - Qoniqarsiz'),
        (3, '3 - O\'rtacha'),
        (4, '4 - Yaxshi'),
        (5, '5 - A\'lo'),
    ]

    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_grades',
        limit_choices_to={'role': 'kurator'},
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='grades',
        limit_choices_to={'role': 'oquvchi'},
    )
    grade = models.PositiveSmallIntegerField(choices=GRADE_CHOICES)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('kurator', 'student')

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.get_grade_display()} ({self.kurator.get_full_name()})"


class KuratorReport(models.Model):
    kurator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kurator_reports',
        limit_choices_to={'role': 'kurator'},
    )
    date = models.DateField()
    report_text = models.TextField()
    groups_covered = models.ManyToManyField(
        'academy.Group',
        blank=True,
        related_name='kurator_reports',
    )

    class Meta:
        ordering = ['-date']
        verbose_name = 'Kurator Report'
        verbose_name_plural = 'Kurator Reports'

    def __str__(self):
        return f"Report by {self.kurator.get_full_name()} ({self.date})"
