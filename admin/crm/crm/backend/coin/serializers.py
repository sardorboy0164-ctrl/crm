from rest_framework import serializers
from .models import CoinTransaction, CoinShopItem, CoinPurchase


class CoinTransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = CoinTransaction
        fields = ['id', 'user', 'user_name', 'amount', 'transaction_type', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class CoinShopItemSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = CoinShopItem
        fields = ['id', 'name', 'description', 'price', 'image', 'is_active', 'stock', 'is_available']
        read_only_fields = ['id']


class CoinPurchaseSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = CoinPurchase
        fields = ['id', 'user', 'user_name', 'item', 'item_name', 'purchased_at', 'coins_spent']
        read_only_fields = ['id', 'purchased_at', 'coins_spent']


class BuyItemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
