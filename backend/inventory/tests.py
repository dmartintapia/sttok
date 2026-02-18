from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from .models import Category, Unit, Product, Deposit, Movement
from .services import register_movement, calculate_stock


class MovementServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")
        self.category = Category.objects.create(name="Electrónica")
        self.unit = Unit.objects.create(name="Unidad", symbol="u")
        self.deposit = Deposit.objects.create(name="Central")
        self.product = Product.objects.create(
            sku="SKU-1",
            name="Producto",
            category=self.category,
            unit=self.unit,
            stock_minimum=Decimal("5"),
        )

    def test_register_purchase_updates_average_cost(self):
        register_movement(
            self.user,
            {
                "product": self.product,
                "deposit": self.deposit,
                "movement_type": Movement.MovementType.PURCHASE,
                "quantity": Decimal("10"),
                "cost": Decimal("50"),
            },
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.average_cost, Decimal("50"))
        self.assertEqual(calculate_stock(self.product), Decimal("10"))

    def test_register_sale_prevents_negative_stock(self):
        with self.assertRaises(ValidationError):
            register_movement(
                self.user,
                {
                    "product": self.product,
                    "deposit": self.deposit,
                    "movement_type": Movement.MovementType.SALE,
                    "quantity": Decimal("2"),
                    "cost": Decimal("0"),
                },
            )
