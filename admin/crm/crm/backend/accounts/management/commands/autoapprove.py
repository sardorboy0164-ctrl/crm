from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Bir hafta ichida admin tasdiqlamagan foydalanuvchilarni avtomatik tasdiqlaydi (roli o\'quvchi bo\'lib qoladi).'

    def handle(self, *args, **options):
        count = 0
        for user in User.objects.filter(is_approved=False):
            if user.auto_approve_if_week_passed():
                count += 1
        self.stdout.write(self.style.SUCCESS(f"{count} ta foydalanuvchi avtomatik tasdiqlandi."))