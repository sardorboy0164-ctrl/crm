from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transactions', views.CoinTransactionViewSet)
router.register(r'shop-items', views.CoinShopItemViewSet)
router.register(r'purchases', views.CoinPurchaseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
