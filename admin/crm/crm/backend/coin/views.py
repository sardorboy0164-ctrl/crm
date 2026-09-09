from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import CoinTransaction, CoinShopItem, CoinPurchase
from .serializers import (
    CoinTransactionSerializer, CoinShopItemSerializer,
    CoinPurchaseSerializer, BuyItemSerializer,
)


class CoinTransactionViewSet(viewsets.ModelViewSet):
    queryset = CoinTransaction.objects.select_related('user').all()
    serializer_class = CoinTransactionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'transaction_type']
    ordering_fields = ['created_at']

    @action(detail=False, methods=['get'], url_path='my-history')
    def my_history(self, request):
        transactions = CoinTransaction.objects.filter(user=request.user)
        serializer = CoinTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def earn(self, request):
        user_id = request.data.get('user_id', request.user.id)
        amount = request.data.get('amount')
        description = request.data.get('description', 'Earned coins')

        if not amount or int(amount) <= 0:
            return Response({'error': 'Amount must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        transaction = CoinTransaction.objects.create(
            user=user,
            amount=abs(int(amount)),
            transaction_type='earn',
            description=description,
        )
        return Response(CoinTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


class CoinShopItemViewSet(viewsets.ModelViewSet):
    queryset = CoinShopItem.objects.all()
    serializer_class = CoinShopItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['price', 'name']

    @action(detail=True, methods=['post'])
    def buy_item(self, request, pk=None):
        item = self.get_object()

        if not item.is_available:
            return Response({'error': 'Item is not available.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.coin_balance < item.price:
            return Response({'error': 'Insufficient coins.'}, status=status.HTTP_400_BAD_REQUEST)

        CoinTransaction.objects.create(
            user=user,
            amount=-item.price,
            transaction_type='spend',
            description=f"Purchased: {item.name}",
        )

        purchase = CoinPurchase.objects.create(
            user=user,
            item=item,
            coins_spent=item.price,
        )

        return Response(CoinPurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class CoinPurchaseViewSet(viewsets.ModelViewSet):
    queryset = CoinPurchase.objects.select_related('user', 'item').all()
    serializer_class = CoinPurchaseSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'item']
    ordering_fields = ['purchased_at']

    @action(detail=False, methods=['get'], url_path='my-purchases')
    def my_purchases(self, request):
        purchases = CoinPurchase.objects.filter(user=request.user).select_related('item')
        serializer = CoinPurchaseSerializer(purchases, many=True)
        return Response(serializer.data)
