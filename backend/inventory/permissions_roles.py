from rest_framework.permissions import BasePermission, SAFE_METHODS

from .tenancy import has_any_role


class CompanyRolePermission(BasePermission):
    """
    Usa `required_roles_by_action` en ViewSets:
    {
      "create": ["owner", "admin"],
      "update": [...],
      ...
    }
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        action = getattr(view, "action", None)
        required = getattr(view, "required_roles_by_action", {}) or {}

        if request.method in SAFE_METHODS and not required.get(action):
            return True

        allowed = required.get(action)
        if not allowed:
            return True
        return has_any_role(request.user, allowed)
