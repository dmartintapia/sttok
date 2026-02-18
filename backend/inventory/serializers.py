from decimal import Decimal
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
from .services import register_movement, calculate_stock


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

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "category",
            "unit",
            "stock_minimum",
            "average_cost",
            "current_stock",
            "created_at",
            "updated_at",
        ]

    def get_current_stock(self, obj):
        return calculate_stock(obj)


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
            "product",
            "deposit",
            "movement_type",
            "quantity",
            "cost",
            "notes",
            "user",
            "created_at",
        ]
        read_only_fields = ["user", "created_at"]

    def validate_quantity(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
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
