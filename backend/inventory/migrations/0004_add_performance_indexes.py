from django.contrib.postgres.indexes import GinIndex
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_product_reserved_stock"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AddIndex(
            model_name="product",
            index=GinIndex(
                fields=["sku"],
                name="inv_prod_sku_trgm",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="product",
            index=GinIndex(
                fields=["name"],
                name="inv_prod_name_trgm",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="movement",
            index=models.Index(fields=["-created_at"], name="inv_mov_created_idx"),
        ),
        migrations.AddIndex(
            model_name="movement",
            index=models.Index(fields=["product", "-created_at"], name="inv_mov_prod_date_idx"),
        ),
    ]
