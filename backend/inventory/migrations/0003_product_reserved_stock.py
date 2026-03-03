from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0002_product_sale_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="reserved_stock",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
