from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from inventory.models import Company, UserCompany, Category, Unit, Product


class TenancyIsolationTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Empresa A", code="empresa-a")
        self.company_b = Company.objects.create(name="Empresa B", code="empresa-b")

        self.user_a = User.objects.create_user(username="user_a", password="pass1234")
        self.user_b = User.objects.create_user(username="user_b", password="pass1234")
        UserCompany.objects.create(user=self.user_a, company=self.company_a)
        UserCompany.objects.create(user=self.user_b, company=self.company_b)

        unit_a = Unit.objects.create(name="Unidad A", symbol="u", company=self.company_a)
        unit_b = Unit.objects.create(name="Unidad B", symbol="u", company=self.company_b)
        cat_a = Category.objects.create(name="Cat A", company=self.company_a)
        cat_b = Category.objects.create(name="Cat B", company=self.company_b)

        Product.objects.create(
            sku="A-001",
            name="Prod A",
            company=self.company_a,
            category=cat_a,
            unit=unit_a,
        )
        Product.objects.create(
            sku="B-001",
            name="Prod B",
            company=self.company_b,
            category=cat_b,
            unit=unit_b,
        )

    def test_user_only_sees_products_from_its_company(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sku"], "A-001")
