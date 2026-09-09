from django.db import models
from django.conf import settings


class CoinTransaction(models.Model):
    TYPE_CHOICES = [
        ('earn', 'Earn'),
        ('spend', 'Spend'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='coin_transactions',
    )
    amount = models.IntegerField(help_text='Positive to add coins, negative to spend')
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.transaction_type} {self.amount} coins"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.user.coin_balance += self.amount
            self.user.save(update_fields=['coin_balance'])


class CoinShopItem(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.PositiveIntegerField()
    image = models.ImageField(upload_to='shop_items/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.name} ({self.price} coins)"

    @property
    def is_available(self):
        return self.is_active and self.stock > 0


class CoinPurchase(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='coin_purchases',
    )
    item = models.ForeignKey(CoinShopItem, on_delete=models.CASCADE, related_name='purchases')
    purchased_at = models.DateTimeField(auto_now_add=True)
    coins_spent = models.PositiveIntegerField()

    class Meta:
        ordering = ['-purchased_at']

    def __str__(self):
        return f"{self.user.get_full_name()} bought {self.item.name}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.item.stock -= 1
            self.item.save(update_fields=['stock'])
