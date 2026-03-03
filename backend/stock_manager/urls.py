from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from inventory.auth_views import LoginView, MeView, CompanyUsersView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", LoginView.as_view(), name="auth_login"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    path("api/auth/users/", CompanyUsersView.as_view(), name="auth_users"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("inventory.urls")),
]
