from rest_framework.exceptions import PermissionDenied

from .models import UserCompany


def get_user_company(user):
    if not user or not user.is_authenticated:
        return None
    rel = UserCompany.objects.select_related("company").filter(user=user).first()
    return rel.company if rel else None


def get_user_company_link(user):
    if not user or not user.is_authenticated:
        return None
    return UserCompany.objects.select_related("company").filter(user=user).first()


ROLE_WEIGHT = {
    UserCompany.Role.VIEWER: 10,
    UserCompany.Role.OPERATOR: 20,
    UserCompany.Role.ADMIN: 30,
    UserCompany.Role.OWNER: 40,
}


def get_user_role(user):
    rel = get_user_company_link(user)
    return rel.role if rel else None


def has_any_role(user, allowed_roles):
    role = get_user_role(user)
    return bool(role and role in set(allowed_roles or []))


def require_company(user):
    company = get_user_company(user)
    if not company:
        raise PermissionDenied("Usuario sin empresa asignada.")
    return company
