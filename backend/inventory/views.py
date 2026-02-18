import logging
from django.db.models import F, Case, When, Value, DecimalField, Sum, ExpressionWrapper
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import (
    Category,
    Unit,
    Product,
    Deposit,
    Movement,
    Client,
    Supplier,
    PriceList,
    AuditLog,
)
from .permissions import IsAdminOrReadOnly, IsOperatorOrAdmin
from .serializers import (
    CategorySerializer,
    UnitSerializer,
    ProductSerializer,
    DepositSerializer,
    MovementSerializer,
    ClientSerializer,
    SupplierSerializer,
    PriceListSerializer,
    AuditLogSerializer,
    StockAlertSerializer,
    StockSummarySerializer,
)
from .services import calculate_stock, POSITIVE_TYPES, NEGATIVE_TYPES

logger = logging.getLogger("inventory")


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAdminOrReadOnly]


class DepositViewSet(viewsets.ModelViewSet):
    queryset = Deposit.objects.all()
    serializer_class = DepositSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]


class MovementViewSet(viewsets.ModelViewSet):
    queryset = Movement.objects.select_related("product", "deposit", "user").all()
    serializer_class = MovementSerializer
    permission_classes = [IsOperatorOrAdmin]
    filterset_fields = ["product", "deposit", "movement_type"]


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrReadOnly]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminOrReadOnly]


class PriceListViewSet(viewsets.ModelViewSet):
    queryset = PriceList.objects.all()
    serializer_class = PriceListSerializer
    permission_classes = [IsAdminOrReadOnly]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrReadOnly]


class StockAlertsView(APIView):
    def get(self, request):
        try:
            alerts = []
            for product in Product.objects.all():
                current_stock = calculate_stock(product)
                if current_stock < product.stock_minimum:
                    alerts.append(
                        {
                            "product_id": product.id,
                            "sku": product.sku,
                            "name": product.name,
                            "stock_minimum": product.stock_minimum,
                            "current_stock": current_stock,
                        }
                    )

            serializer = StockAlertSerializer(alerts, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Error al calcular alertas de stock")
            return Response(
                {"detail": "Error al calcular alertas", "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StockSummaryView(APIView):
    def get(self, request):
        try:
            signed_quantity = Case(
                When(movement_type__in=POSITIVE_TYPES, then=F("quantity")),
                When(
                    movement_type__in=NEGATIVE_TYPES,
                    then=ExpressionWrapper(-1 * F("quantity"), output_field=DecimalField()),
                ),
                default=Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
            summary = (
                Movement.objects.values(
                    "product_id",
                    "deposit_id",
                    "product__sku",
                    "product__name",
                    "deposit__name",
                )
                .annotate(current_stock=Sum(signed_quantity))
                .order_by("product__sku")
            )

            serializer = StockSummarySerializer(
                [
                    {
                        "product_id": item["product_id"],
                        "deposit_id": item["deposit_id"],
                        "sku": item["product__sku"],
                        "product_name": item["product__name"],
                        "deposit_name": item["deposit__name"],
                        "current_stock": item["current_stock"] or 0,
                    }
                    for item in summary
                ],
                many=True,
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Error al calcular resumen de stock")
            return Response(
                {"detail": "Error al calcular resumen", "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
