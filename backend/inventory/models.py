from django.conf import settings
from django.db import models
from django.contrib.postgres.indexes import GinIndex


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Company(TimestampedModel):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=60, unique=True)

    class Meta:
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name


class UserCompany(TimestampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="users")

    def __str__(self):
        return f"{self.user} -> {self.company.code}"


class Category(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return self.name


class Unit(TimestampedModel):
    name = models.CharField(max_length=50, unique=True)
    symbol = models.CharField(max_length=10)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class Deposit(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=150, blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return self.name


class Product(TimestampedModel):
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT)
    stock_minimum = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reserved_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        indexes = [
            GinIndex(fields=["sku"], name="inv_prod_sku_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name"], name="inv_prod_name_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"


class Client(TimestampedModel):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return self.name


class Supplier(TimestampedModel):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return self.name


class PriceList(TimestampedModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)

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
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        indexes = [
            models.Index(fields=["-created_at"], name="inv_mov_created_idx"),
            models.Index(fields=["product", "-created_at"], name="inv_mov_prod_date_idx"),
        ]

    def __str__(self):
        return f"{self.product} - {self.movement_type} - {self.quantity}"


class AuditLog(models.Model):
    action = models.CharField(max_length=200)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    company = models.ForeignKey(Company, on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.action} ({self.created_at})"
