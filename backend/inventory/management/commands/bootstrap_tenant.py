from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
import uuid

from inventory.models import Company, UserCompany


def build_internal_username(company_code, login_username):
    User = get_user_model()
    safe_company = slugify(str(company_code or "").strip().lower())[:24] or "co"
    safe_login = slugify(str(login_username or "").strip().lower())[:24] or "user"
    candidate = f"{safe_company}__{safe_login}"
    if len(candidate) > 150:
        candidate = candidate[:150]

    if not User.objects.filter(username=candidate).exists():
        return candidate

    while True:
        suffix = uuid.uuid4().hex[:8]
        alt = f"{candidate[: max(1, 150 - 9)]}_{suffix}"
        if not User.objects.filter(username=alt).exists():
            return alt


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

        membership = (
            UserCompany.objects.select_related("user")
            .filter(company=company, login_username__iexact=username)
            .first()
        )

        if membership:
            user = membership.user
            created = False
        else:
            internal_username = build_internal_username(company.code, username)
            user = User.objects.create(username=internal_username)
            created = True

        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        UserCompany.objects.update_or_create(
            user=user,
            defaults={
                "company": company,
                "role": UserCompany.Role.OWNER,
                "login_username": username,
            },
        )

        status = "creado" if created else "actualizado"
        self.stdout.write(
            self.style.SUCCESS(
                f"Bootstrap OK | empresa={company.code} usuario={username} ({status})"
            )
        )
