from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from inventory.models import Company, UserCompany


class Command(BaseCommand):
    help = "Crea/actualiza una empresa y su usuario administrador inicial."

    def add_arguments(self, parser):
        parser.add_argument("--company-code", required=True)
        parser.add_argument("--company-name", required=True)
        parser.add_argument("--username", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        code = str(options["company_code"]).strip().lower()
        name = str(options["company_name"]).strip()
        username = str(options["username"]).strip()
        password = str(options["password"]).strip()

        if not code or not name or not username or not password:
            raise CommandError("Todos los parametros son obligatorios.")

        User = get_user_model()
        company, _ = Company.objects.get_or_create(code=code, defaults={"name": name})
        if company.name != name:
            company.name = name
            company.save(update_fields=["name"])

        user, created = User.objects.get_or_create(username=username)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        UserCompany.objects.update_or_create(
            user=user,
            defaults={"company": company, "role": UserCompany.Role.OWNER},
        )

        status = "creado" if created else "actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"Bootstrap OK | empresa={company.code} usuario={user.username} ({status})"
            )
        )
