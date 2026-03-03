from rest_framework.exceptions import PermissionDenied

from .models import UserCompany


def get_user_company(user):
    if not user or not user.is_authenticated:
        return None
    rel = UserCompany.objects.select_related("company").filter(user=user).first()
    return rel.company if rel else None


def require_company(user):
    company = get_user_company(user)
    if not company:
        raise PermissionDenied("Usuario sin empresa asignada.")
    return company
