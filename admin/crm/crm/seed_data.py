import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'education_crm.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
django.setup()

from accounts.models import User, TeacherSubject, ParentStudent
from academy.models import Group, GroupStudent, Attendance, Homework, Lesson
from quiz.models import Quiz, Question, Choice
from coin.models import CoinShopItem

print("Test data yaratilmoqda...")

# Admin
admin, _ = User.objects.get_or_create(
    username='admin', defaults={
        'email': 'admin@education.uz', 'first_name': 'Admin', 'last_name': 'Boshqaruvchi',
        'role': 'admin', 'is_staff': True, 'is_superuser': True
    }
)
admin.set_password('admin123')
admin.save()
print("  Admin: admin / admin123")

# Ustozlar
teachers_data = [
    ('ali_ustoz', 'Ali', 'Karimov', 'ustoz', 'ingliz_tili'),
    ('vali_ustoz', 'Vali', 'Rahimov', 'ustoz', 'matematika'),
    ('nilufar_ustoz', 'Nilufar', 'Ismoilova', 'ustoz', 'rus_tili'),
]
teachers = []
for uname, fn, ln, role, subject in teachers_data:
    t, _ = User.objects.get_or_create(
        username=uname, defaults={
            'first_name': fn, 'last_name': ln, 'role': role, 'phone': '+998901234567'
        }
    )
    t.set_password('123456')
    t.save()
    TeacherSubject.objects.get_or_create(teacher=t, subject=subject)
    teachers.append(t)
    print(f"  Ustoz: {uname} / 123456 ({subject})")

# Kurator
kurator, _ = User.objects.get_or_create(
    username='kurator', defaults={
        'first_name': 'Sardor', 'last_name': 'Aliyev', 'role': 'kurator'
    }
)
kurator.set_password('123456')
kurator.save()
print("  Kurator: kurator / 123456")

# Oquvchilar
students = []
for i in range(1, 11):
    uname = f'oquvchi{i}'
    s, _ = User.objects.get_or_create(
        username=uname,
        defaults={
            'first_name': f'Oquvchi', 'last_name': f'Talaba{i}',
            'role': 'oquvchi', 'phone': f'+99890111{i:04d}'
        }
    )
    s.set_password('123456')
    s.save()
    students.append(s)
print(f"  O'quvchilar: oquvchi1-oquvchi10 / 123456")

# Ota-onalar
parent1, _ = User.objects.get_or_create(
    username='ota1', defaults={
        'first_name': 'Otajon', 'last_name': 'Talabov', 'role': 'ota_ona'
    }
)
parent1.set_password('123456')
parent1.save()
ParentStudent.objects.get_or_create(parent=parent1, student=students[0])
print("  Ota-ona: ota1 / 123456 (oquvchi1 ga bog'langan)")

# Guruhlar
groups_data = [
    ('Ingliz tili - A', 'ingliz_tili', teachers[0], 20),
    ('Matematika - A', 'matematika', teachers[1], 20),
    ('Rus tili - A', 'rus_tili', teachers[2], 15),
]
groups = []
for name, subj, teacher, max_s in groups_data:
    g, _ = Group.objects.get_or_create(
        name=name, defaults={
            'subject': subj, 'teacher': teacher, 'kurator': kurator,
            'room': f'Xona {len(groups)+1}', 'schedule': 'Dush-Juma 14:00-16:00',
            'max_students': max_s
        }
    )
    groups.append(g)
    print(f"  Guruh: {name}")

# Oquvchilarni guruhlarga qo'shish
for i, student in enumerate(students[:5]):
    GroupStudent.objects.get_or_create(group=groups[0], student=student)
for i, student in enumerate(students[5:]):
    GroupStudent.objects.get_or_create(group=groups[1], student=student)
print("  O'quvchilar guruhlarga qo'shildi")

# Davomat
from datetime import date
for student in students[:3]:
    Attendance.objects.get_or_create(
        student=student, group=groups[0], date=date.today(),
        defaults={'is_present': True, 'marked_by': teachers[0]}
    )
print("  Davomat yaratildi")

# Uy vazifalari
hw, _ = Homework.objects.get_or_create(
    group=groups[0], title='Ingliz tili - Home Work 1',
    defaults={'description': 'Unit 1 vocabulary worksheet', 'due_date': '2026-08-25', 'created_by': teachers[0]}
)
print("  Uy vazifasi yaratildi")

# Dars
Lesson.objects.get_or_create(
    group=groups[0], topic='Present Simple Tense',
    defaults={'description': 'Present Simple bilan tanishish', 'date': date.today(), 'teacher': teachers[0], 'room': 'Xona 1'}
)
print("  Dars yaratildi")

# Quiz
quiz, _ = Quiz.objects.get_or_create(
    title='Ingliz tili - Test 1',
    defaults={
        'subject': 'ingliz_tili', 'group': groups[0], 'teacher': teachers[0],
        'time_limit_minutes': 20, 'passing_score': 60, 'is_active': True
    }
)
q1, _ = Question.objects.get_or_create(quiz=quiz, text="What is 'Hello' in Uzbek?", defaults={'order': 1})
for i, (txt, correct) in enumerate([
    ('Salom', True), ('Rahmat', False), ('Xayr', False), ('Kechirasiz', False)
]):
    Choice.objects.get_or_create(question=q1, text=txt, defaults={'is_correct': correct})

q2, _ = Question.objects.get_or_create(quiz=quiz, text="'Good morning' qanday tarjima qilinadi?", defaults={'order': 2})
for i, (txt, correct) in enumerate([
    ('Xayrli kun', False), ('Xayrli ertalab', True), ('Xayrli kech', False), ('Xayrli tun', False)
]):
    Choice.objects.get_or_create(question=q2, text=txt, defaults={'is_correct': correct})
print("  Quiz yaratildi (2 ta savol bilan)")

# Coin do'kon
CoinShopItem.objects.get_or_create(
    name='Qalam', defaults={'description': 'Rangli qalam', 'price': 50, 'stock': 100, 'is_active': True}
)
CoinShopItem.objects.get_or_create(
    name='Daftar', defaults={'description': 'Chiroyli daftar', 'price': 100, 'stock': 50, 'is_active': True}
)
CoinShopItem.objects.get_or_create(
    name='Stiker', defaults={'description': 'Manga stiker', 'price': 200, 'stock': 30, 'is_active': True}
)
print("  Coin do'kon mahsulotlari yaratildi")

# Intern
intern, _ = User.objects.get_or_create(
    username='intern', defaults={
        'first_name': 'Jamshid', 'last_name': 'Nazarov', 'role': 'intern'
    }
)
intern.set_password('123456')
intern.save()
print("  Intern: intern / 123456")

# Qowimcha ustoz
qw_ustoz, _ = User.objects.get_or_create(
    username='qw_ustoz', defaults={
        'first_name': 'Dilshod', 'last_name': 'Mirzayev', 'role': 'qowimcha_ustoz'
    }
)
qw_ustoz.set_password('123456')
qw_ustoz.save()
TeacherSubject.objects.get_or_create(teacher=qw_ustoz, subject='fizika')
print("  Qowimcha ustoz: qw_ustoz / 123456")

print("\n✅ Barcha test data yaratildi!")
print("\nLogin ma'lumotlari:")
print("  admin / admin123")
print("  ali_ustoz / 123456")
print("  vali_ustoz / 123456")
print("  nilufar_ustoz / 123456")
print("  kurator / 123456")
print("  oquvchi1-oquvchi10 / 123456")
print("  ota1 / 123456")
print("  intern / 123456")
print("  qw_ustoz / 123456")
