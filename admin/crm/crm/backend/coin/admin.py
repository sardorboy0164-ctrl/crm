from django.contrib import admin
from .models import CoinTransaction, CoinShopItem, CoinPurchase


@admin.register(CoinTransaction)
class CoinTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'transaction_type', 'description', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('user__username', 'description')


@admin.register(CoinShopItem)
class CoinShopItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock', 'is_active')
    list_filter = ('is_active',)


@admin.register(CoinPurchase)
class CoinPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'item', 'coins_spent', 'purchased_at')
    list_filter = ('purchased_at',)
