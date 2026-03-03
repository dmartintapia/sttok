from django.db import migrations
from django.contrib.auth.hashers import check_password, make_password


def harden_default_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    user = User.objects.filter(username="admin").first()
    if not user:
        return
    if check_password("admin123", user.password):
        user.is_active = False
        user.is_staff = False
        user.is_superuser = False
        user.password = make_password(None)
        user.save(update_fields=["is_active", "is_staff", "is_superuser", "password"])


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0005_company_usercompany_auditlog_company_and_more"),
    ]

    operations = [
        migrations.RunPython(harden_default_admin, migrations.RunPython.noop),
    ]
