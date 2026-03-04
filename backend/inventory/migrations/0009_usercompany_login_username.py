from django.db import migrations, models


def seed_login_usernames(apps, schema_editor):
    UserCompany = apps.get_model("inventory", "UserCompany")

    seen = set()
    rows = UserCompany.objects.select_related("user", "company").order_by("company_id", "id")
    for row in rows:
        base = (row.user.username or f"user{row.user_id}")[:50]
        candidate = base
        suffix = 1
        while (row.company_id, candidate.lower()) in seen:
            tail = f"-{suffix}"
            candidate = f"{base[: max(1, 50 - len(tail))]}{tail}"
            suffix += 1

        row.login_username = candidate
        row.save(update_fields=["login_username"])
        seen.add((row.company_id, candidate.lower()))


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0008_usercompany_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="usercompany",
            name="login_username",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.RunPython(seed_login_usernames, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="usercompany",
            constraint=models.UniqueConstraint(
                fields=("company", "login_username"),
                name="uq_usercompany_company_login_username",
            ),
        ),
    ]
