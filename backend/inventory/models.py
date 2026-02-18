from django.conf import settings
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Unit(TimestampedModel):
    name = models.CharField(max_length=50, unique=True)
    symbol = models.CharField(max_length=10)

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class Deposit(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return self.name


class Product(TimestampedModel):
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)
    stock_minimum = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.sku} - {self.name}"


class Client(TimestampedModel):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


class Supplier(TimestampedModel):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


class PriceList(TimestampedModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Movement(TimestampedModel):
    class MovementType(models.TextChoices):
        PURCHASE = "PURCHASE", "Compra"
        SALE = "SALE", "Venta"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"
        RETURN = "RETURN", "Devolución"

    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    deposit = models.ForeignKey(Deposit, on_delete=models.PROTECT)
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.product} - {self.movement_type} - {self.quantity}"


class AuditLog(models.Model):
    action = models.CharField(max_length=200)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.action} ({self.created_at})"
