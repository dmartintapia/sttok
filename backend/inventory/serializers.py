from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.db import transaction

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
from .services import register_movement, calculate_stock, calculate_available_stock
from .tenancy import require_company


def get_or_create_system_user():
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        username="system_api",
        defaults={
            "email": "system-api@local",
            "is_staff": True,
            "is_active": True,
        },
    )
    if not user.has_usable_password():
        return user
    user.set_unusable_password()
    user.save(update_fields=["password"])
    return user


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    current_stock = serializers.SerializerMethodField()
    available_stock = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    last_movement_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "company",
            "sku",
            "name",
            "category",
            "category_name",
            "unit",
            "stock_minimum",
            "average_cost",
            "sale_price",
            "reserved_stock",
            "current_stock",
            "available_stock",
            "last_movement_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["company"]

    def get_current_stock(self, obj):
        return calculate_stock(obj)

    def get_available_stock(self, obj):
        return calculate_available_stock(obj)

    @transaction.atomic
    def update(self, instance, validated_data):
        old_sale_price = instance.sale_price
        old_stock_minimum = instance.stock_minimum

        product = super().update(instance, validated_data)

        changed_fields = {}
        if "sale_price" in validated_data and product.sale_price != old_sale_price:
            changed_fields["sale_price"] = {
                "before": str(old_sale_price),
                "after": str(product.sale_price),
            }
        if "stock_minimum" in validated_data and product.stock_minimum != old_stock_minimum:
            changed_fields["stock_minimum"] = {
                "before": str(old_stock_minimum),
                "after": str(product.stock_minimum),
            }

        if changed_fields:
            request = self.context.get("request")
            request_user = getattr(request, "user", None)
            user = (
                request_user
                if request_user and request_user.is_authenticated
                else get_or_create_system_user()
            )
            AuditLog.objects.create(
                action="Actualizacion de parametros de producto",
                user=user,
                metadata={
                    "product_id": product.id,
                    "sku": product.sku,
                    "changes": changed_fields,
                },
            )

        return product


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class PriceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceList
        fields = "__all__"


class MovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movement
        fields = [
            "id",
            "company",
            "product",
            "deposit",
            "movement_type",
            "quantity",
            "cost",
            "notes",
            "user",
            "created_at",
        ]
        read_only_fields = ["user", "created_at", "company"]

    def validate_quantity(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        company = require_company(getattr(request, "user", None))
        product = attrs.get("product")
        deposit = attrs.get("deposit")

        if product and product.company_id and product.company_id != company.id:
            raise serializers.ValidationError("Producto fuera de la empresa del usuario.")
        if deposit and deposit.company_id and deposit.company_id != company.id:
            raise serializers.ValidationError("Almacen fuera de la empresa del usuario.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request_user = self.context["request"].user
        user = (
            request_user
            if request_user and request_user.is_authenticated
            else get_or_create_system_user()
        )
        validated_data["company"] = require_company(request_user)
        return register_movement(user, validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ["created_at"]


class StockAlertSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    sku = serializers.CharField()
    name = serializers.CharField()
    stock_minimum = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=2)


class StockSummarySerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    deposit_id = serializers.IntegerField()
    sku = serializers.CharField()
    product_name = serializers.CharField()
    deposit_name = serializers.CharField()
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=2)
