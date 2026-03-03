import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from django.db.models import F, Case, When, Value, DecimalField, Sum, ExpressionWrapper, Q, Max
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.dateparse import parse_date

from .permissions import IsAdminOrReadOnly
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
from .services import register_movement, calculate_available_stock
from .tenancy import require_company
from .permissions_roles import CompanyRolePermission

logger = logging.getLogger("inventory")


class ProductCatalogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class KardexPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 300


def _parse_notes(notes):
    raw = str(notes or "")
    if "MOTIVO::" not in raw and "REF::" not in raw:
        return raw.strip(), ""
    motivo = ""
    referencia = ""
    for part in raw.split("||"):
        if part.startswith("MOTIVO::"):
            motivo = part.replace("MOTIVO::", "").strip()
        if part.startswith("REF::"):
            referencia = part.replace("REF::", "").strip()
    return motivo, referencia


def _api_type_to_ui_type(movement_type, notes):
    if movement_type in (Movement.MovementType.PURCHASE, Movement.MovementType.RETURN):
        return "entrada"
    if movement_type == Movement.MovementType.ADJUSTMENT:
        return "ajuste"

    normalized = str(notes or "").lower()
    if movement_type == Movement.MovementType.SALE and any(
        token in normalized for token in ("robo", "rotura", "vencimiento", "ajuste")
    ):
        return "ajuste"
    return "salida"


class CompanyScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CompanyRolePermission]
    required_roles_by_action = {}

    def get_company(self):
        return require_company(self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(company=self.get_company())

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class CompanyScopedReadOnlyModelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_company(self):
        return require_company(self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(company=self.get_company())


class CategoryViewSet(CompanyScopedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }


class UnitViewSet(CompanyScopedModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer


class DepositViewSet(CompanyScopedModelViewSet):
    queryset = Deposit.objects.all()
    serializer_class = DepositSerializer


class ProductViewSet(CompanyScopedModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [SearchFilter]
    search_fields = ["sku", "name"]
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
        "bulk_price_update": ["owner", "admin"],
        "reserve": ["owner", "admin", "operator"],
        "release_reservation": ["owner", "admin", "operator"],
        "dispatch_reservation": ["owner", "admin", "operator"],
    }

    @action(detail=False, methods=["get"], url_path="catalog")
    def catalog(self, request):
        company = self.get_company()
        queryset = (
            Product.objects.select_related("category")
            .filter(company=company)
            .annotate(last_movement_at=Max("movement__created_at"))
            .order_by("sku")
        )

        query = str(request.query_params.get("q", "")).strip()
        if query:
            queryset = queryset.filter(Q(sku__icontains=query) | Q(name__icontains=query))

        category_name = str(request.query_params.get("category", "")).strip()
        if category_name:
            queryset = queryset.filter(category__name__iexact=category_name)

        paginator = ProductCatalogPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"], url_path="quick-search")
    def quick_search(self, request):
        company = self.get_company()
        query = str(request.query_params.get("q", "")).strip()
        if len(query) < 2:
            return Response([], status=status.HTTP_200_OK)

        try:
            limit = int(request.query_params.get("limit", 25))
        except ValueError:
            limit = 25
        limit = max(1, min(limit, 100))

        queryset = (
            Product.objects.filter(company=company).filter(
                Q(sku__icontains=query) | Q(name__icontains=query)
            )
            .order_by("sku")[:limit]
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reserve")
    def reserve(self, request, pk=None):
        company = self.get_company()
        product = self.get_object()
        try:
            quantity = Decimal(str(request.data.get("quantity")))
        except Exception:
            return Response({"detail": "La cantidad debe ser un numero valido."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"detail": "La cantidad debe ser mayor a cero."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            return Response({"detail": "El motivo de reserva es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        available = calculate_available_stock(product)
        if quantity > available:
            return Response(
                {"detail": "No hay stock disponible suficiente para reservar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            product.reserved_stock = (product.reserved_stock or Decimal("0")) + quantity
            product.save(update_fields=["reserved_stock"])
            AuditLog.objects.create(
                action="Reserva de stock",
                user=request.user,
                company=company,
                metadata={
                    "product_id": product.id,
                    "sku": product.sku,
                    "quantity": str(quantity),
                    "reason": reason,
                    "reference": request.data.get("reference", ""),
                },
            )

        serializer = self.get_serializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="release-reservation")
    def release_reservation(self, request, pk=None):
        company = self.get_company()
        product = self.get_object()
        try:
            quantity = Decimal(str(request.data.get("quantity")))
        except Exception:
            return Response({"detail": "La cantidad debe ser un numero valido."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"detail": "La cantidad debe ser mayor a cero."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            return Response({"detail": "El motivo de liberacion es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        reserved = product.reserved_stock or Decimal("0")
        if quantity > reserved:
            return Response(
                {"detail": "No hay stock reservado suficiente para liberar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            product.reserved_stock = reserved - quantity
            product.save(update_fields=["reserved_stock"])
            AuditLog.objects.create(
                action="Liberacion de reserva",
                user=request.user,
                company=company,
                metadata={
                    "product_id": product.id,
                    "sku": product.sku,
                    "quantity": str(quantity),
                    "reason": reason,
                    "reference": request.data.get("reference", ""),
                },
            )

        serializer = self.get_serializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="dispatch-reservation")
    def dispatch_reservation(self, request, pk=None):
        company = self.get_company()
        product = self.get_object()
        try:
            quantity = Decimal(str(request.data.get("quantity")))
        except Exception:
            return Response({"detail": "La cantidad debe ser un numero valido."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"detail": "La cantidad debe ser mayor a cero."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            return Response({"detail": "El motivo de despacho es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        deposit_id = request.data.get("deposit")
        if not deposit_id:
            return Response({"detail": "Debe indicar un almacen para despachar."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            deposit = Deposit.objects.get(id=deposit_id, company=company)
        except Deposit.DoesNotExist:
            return Response({"detail": "El almacen indicado no existe."}, status=status.HTTP_400_BAD_REQUEST)

        reserved = product.reserved_stock or Decimal("0")
        if quantity > reserved:
            return Response(
                {"detail": "No hay stock reservado suficiente para despachar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                register_movement(
                    request.user,
                    {
                        "company": company,
                        "product": product,
                        "deposit": deposit,
                        "movement_type": Movement.MovementType.SALE,
                        "quantity": quantity,
                        "cost": Decimal("0"),
                        "notes": f"DESPACHO_RESERVA | {reason}",
                    },
                )
                product.refresh_from_db()
                product.reserved_stock = (product.reserved_stock or Decimal("0")) - quantity
                product.save(update_fields=["reserved_stock"])
                AuditLog.objects.create(
                    action="Despacho de reserva",
                    user=request.user,
                    company=company,
                    metadata={
                        "product_id": product.id,
                        "sku": product.sku,
                        "deposit_id": deposit.id,
                        "deposit_name": deposit.name,
                        "quantity": str(quantity),
                        "reason": reason,
                        "reference": request.data.get("reference", ""),
                    },
                )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-price-update")
    def bulk_price_update(self, request):
        company = self.get_company()
        try:
            percentage = Decimal(str(request.data.get("percentage")))
        except Exception:
            return Response(
                {"detail": "El porcentaje debe ser un numero valido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category_id = request.data.get("category_id")
        multiplier = Decimal("1") + (percentage / Decimal("100"))
        if multiplier < 0:
            return Response(
                {"detail": "El porcentaje no puede dejar precios negativos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        products_qs = Product.objects.filter(company=company)
        if category_id not in (None, "", "null"):
            products_qs = products_qs.filter(category_id=category_id)

        updated_count = 0
        audit_user = request.user
        for product in products_qs:
            new_price = (product.sale_price * multiplier).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if new_price < 0:
                new_price = Decimal("0.00")
            if new_price != product.sale_price:
                old_price = product.sale_price
                product.sale_price = new_price
                product.save(update_fields=["sale_price"])
                updated_count += 1
                AuditLog.objects.create(
                    action="Actualizacion masiva de precio",
                    user=audit_user,
                    company=company,
                    metadata={
                        "product_id": product.id,
                        "sku": product.sku,
                        "before": str(old_price),
                        "after": str(new_price),
                        "percentage": str(percentage),
                        "category_id": category_id,
                    },
                )

        return Response(
            {
                "updated": updated_count,
                "percentage": str(percentage),
                "category_id": category_id,
            },
            status=status.HTTP_200_OK,
        )


class MovementViewSet(CompanyScopedModelViewSet):
    queryset = Movement.objects.select_related("product", "deposit", "user").all()
    serializer_class = MovementSerializer
    filterset_fields = ["product", "deposit", "movement_type"]
    required_roles_by_action = {
        "create": ["owner", "admin", "operator"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }

    @action(detail=False, methods=["get"], url_path="kardex")
    def kardex(self, request):
        company = self.get_company()
        queryset = (
            Movement.objects.select_related("product", "deposit")
            .filter(company=company)
            .all()
            .order_by("created_at", "id")
        )

        product_id = request.query_params.get("product")
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        query = str(request.query_params.get("q", "")).strip()
        if query:
            queryset = queryset.filter(Q(product__sku__icontains=query) | Q(product__name__icontains=query))

        tipo = str(request.query_params.get("tipo", "")).strip().lower()
        if tipo == "entrada":
            queryset = queryset.filter(
                movement_type__in=[Movement.MovementType.PURCHASE, Movement.MovementType.RETURN]
            )
        elif tipo == "salida":
            queryset = queryset.filter(movement_type=Movement.MovementType.SALE).exclude(
                Q(notes__icontains="robo")
                | Q(notes__icontains="rotura")
                | Q(notes__icontains="vencimiento")
                | Q(notes__icontains="ajuste")
            )
        elif tipo == "ajuste":
            queryset = queryset.filter(
                Q(movement_type=Movement.MovementType.ADJUSTMENT)
                | (
                    Q(movement_type=Movement.MovementType.SALE)
                    & (
                        Q(notes__icontains="robo")
                        | Q(notes__icontains="rotura")
                        | Q(notes__icontains="vencimiento")
                        | Q(notes__icontains="ajuste")
                    )
                )
            )

        desde = parse_date(str(request.query_params.get("desde", "")).strip())
        if isinstance(desde, date):
            queryset = queryset.filter(created_at__date__gte=desde)

        hasta = parse_date(str(request.query_params.get("hasta", "")).strip())
        if isinstance(hasta, date):
            queryset = queryset.filter(created_at__date__lte=hasta)

        balances = {}
        rows = []
        for movement in queryset.iterator():
            ui_type = _api_type_to_ui_type(movement.movement_type, movement.notes)
            sign = Decimal("-1") if ui_type in ("salida", "ajuste") else Decimal("1")
            current = balances.get(movement.product_id, Decimal("0"))
            saldo = current + (sign * movement.quantity)
            balances[movement.product_id] = saldo
            motivo, referencia = _parse_notes(movement.notes)

            rows.append(
                {
                    "id": movement.id,
                    "fecha": movement.created_at.date().isoformat(),
                    "producto_id": movement.product_id,
                    "sku": movement.product.sku,
                    "producto": movement.product.name,
                    "deposito": movement.deposit.name,
                    "tipo": ui_type,
                    "cantidad": float(movement.quantity),
                    "saldo": float(saldo),
                    "motivo": motivo,
                    "referencia": referencia or f"MOV-{movement.id}",
                }
            )

        rows.reverse()
        paginator = KardexPagination()
        page = paginator.paginate_queryset(rows, request, view=self)
        return paginator.get_paginated_response(page)


class ClientViewSet(CompanyScopedModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, CompanyRolePermission]
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }


class SupplierViewSet(CompanyScopedModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, CompanyRolePermission]
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }


class PriceListViewSet(CompanyScopedModelViewSet):
    queryset = PriceList.objects.all()
    serializer_class = PriceListSerializer
    permission_classes = [IsAuthenticated, CompanyRolePermission]
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }


class AuditLogViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrReadOnly]


class StockAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = require_company(request.user)
        try:
            alerts = []
            for product in Product.objects.filter(company=company):
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = require_company(request.user)
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
                Movement.objects.filter(company=company).values(
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


class ActiveReservationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = require_company(request.user)
        try:
            reservation_actions = {
                "Reserva de stock": Decimal("1"),
                "Liberacion de reserva": Decimal("-1"),
                "Despacho de reserva": Decimal("-1"),
            }
            logs = (
                AuditLog.objects.filter(action__in=reservation_actions.keys(), company=company)
                .order_by("created_at")
                .values("action", "created_at", "metadata")
            )

            by_key = {}
            product_ids = set()
            for log in logs:
                metadata = log.get("metadata") or {}
                product_id = metadata.get("product_id")
                if not product_id:
                    continue
                reference = str(metadata.get("reference") or "SIN-REFERENCIA").strip()
                key = (int(product_id), reference)
                product_ids.add(int(product_id))

                try:
                    qty = Decimal(str(metadata.get("quantity", "0")))
                except Exception:
                    qty = Decimal("0")
                signed_qty = qty * reservation_actions[log["action"]]

                if key not in by_key:
                    by_key[key] = {
                        "product_id": int(product_id),
                        "reference": reference,
                        "reserved_quantity": Decimal("0"),
                        "last_update": log["created_at"],
                        "reason": str(metadata.get("reason") or "").strip(),
                        "sku": str(metadata.get("sku") or ""),
                    }

                by_key[key]["reserved_quantity"] += signed_qty
                by_key[key]["last_update"] = log["created_at"]
                reason = str(metadata.get("reason") or "").strip()
                if reason:
                    by_key[key]["reason"] = reason
                if not by_key[key]["sku"]:
                    by_key[key]["sku"] = str(metadata.get("sku") or "")

            products_by_id = Product.objects.filter(company=company).in_bulk(product_ids)
            active_rows = []
            for item in by_key.values():
                if item["reserved_quantity"] <= 0:
                    continue
                product = products_by_id.get(item["product_id"])
                active_rows.append(
                    {
                        "product_id": item["product_id"],
                        "sku": item["sku"] or (product.sku if product else ""),
                        "product_name": product.name if product else f"Producto {item['product_id']}",
                        "reference": item["reference"],
                        "reason": item["reason"],
                        "reserved_quantity": item["reserved_quantity"],
                        "last_update": item["last_update"],
                    }
                )

            active_rows.sort(key=lambda row: (row["reserved_quantity"], row["last_update"]), reverse=True)
            return Response(active_rows, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Error al calcular reservas activas")
            return Response(
                {"detail": "Error al calcular reservas activas", "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }
    required_roles_by_action = {
        "create": ["owner", "admin"],
        "update": ["owner", "admin"],
        "partial_update": ["owner", "admin"],
        "destroy": ["owner", "admin"],
    }
