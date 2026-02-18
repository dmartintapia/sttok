from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    UnitViewSet,
    ProductViewSet,
    DepositViewSet,
    MovementViewSet,
    ClientViewSet,
    SupplierViewSet,
    PriceListViewSet,
    AuditLogViewSet,
    StockAlertsView,
    StockSummaryView,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet)
router.register(r"units", UnitViewSet)
router.register(r"products", ProductViewSet)
router.register(r"deposits", DepositViewSet)
router.register(r"movements", MovementViewSet)
router.register(r"clients", ClientViewSet)
router.register(r"suppliers", SupplierViewSet)
router.register(r"price-lists", PriceListViewSet)
router.register(r"audit-logs", AuditLogViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/alerts/", StockAlertsView.as_view(), name="stock-alerts"),
    path("dashboard/summary/", StockSummaryView.as_view(), name="stock-summary"),
]
