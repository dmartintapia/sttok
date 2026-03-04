import json
import os
from urllib import parse, request as urlrequest

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Company, UserCompany
from .tenancy import get_user_company_link, has_any_role
from .throttles import (
    LoginEmailRateThrottle,
    LoginIpRateThrottle,
    SignupEmailRateThrottle,
    SignupIpRateThrottle,
    clear_login_failures,
    get_login_failures,
    register_login_failure,
)

MAX_LOGIN_FAILURES = int(os.getenv("AUTH_MAX_LOGIN_FAILURES", "5"))
LOGIN_LOCK_SECONDS = int(os.getenv("AUTH_LOGIN_LOCK_SECONDS", "900"))
FREE_PLAN_MAX_SKUS = int(os.getenv("FREE_PLAN_MAX_SKUS", "100"))
SUPPORT_CONTACT = os.getenv("SUPPORT_CONTACT", "contacto@tu-dominio.com")
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def _build_company_code(raw_name, raw_code=""):
    base = str(raw_code or "").strip().lower()
    if not base:
        base = slugify(str(raw_name or "").strip().lower())
    return base[:60]


def _verify_turnstile(token, ip_address):
    if not TURNSTILE_SECRET_KEY:
        return True

    payload = parse.urlencode(
        {
            "secret": TURNSTILE_SECRET_KEY,
            "response": str(token or "").strip(),
            "remoteip": str(ip_address or "").strip(),
        }
    ).encode("utf-8")

    req = urlrequest.Request(TURNSTILE_VERIFY_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urlrequest.urlopen(req, timeout=8) as res:
            body = json.loads(res.read().decode("utf-8"))
            return bool(body.get("success"))
    except Exception:
        return False


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginIpRateThrottle, LoginEmailRateThrottle]

    def post(self, request):
        company_code = str(request.data.get("company", "")).strip().lower()
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", "")).strip()
        ip_address = _client_ip(request)

        if not company_code or not username or not password:
            return Response(
                {"detail": "Empresa, usuario y contrasena son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        failure_count = get_login_failures(company_code, username.lower(), ip_address)
        if failure_count >= MAX_LOGIN_FAILURES:
            return Response(
                {
                    "detail": "Demasiados intentos fallidos. Espera 15 minutos.",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        company = Company.objects.filter(code__iexact=company_code).first()
        if not company:
            register_login_failure(company_code, username.lower(), ip_address, LOGIN_LOCK_SECONDS)
            return Response(
                {"detail": "Empresa inexistente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request, username=username, password=password)
        if not user:
            register_login_failure(company_code, username.lower(), ip_address, LOGIN_LOCK_SECONDS)
            return Response(
                {"detail": "Credenciales invalidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        membership = UserCompany.objects.filter(user=user, company=company).first()
        if not membership:
            register_login_failure(company_code, username.lower(), ip_address, LOGIN_LOCK_SECONDS)
            return Response(
                {"detail": "El usuario no pertenece a la empresa indicada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        clear_login_failures(company_code, username.lower(), ip_address)

        refresh = RefreshToken.for_user(user)
        refresh["company_id"] = company.id
        refresh["company_code"] = company.code

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                },
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "code": company.code,
                },
                "role": membership.role,
            },
            status=status.HTTP_200_OK,
        )


class PublicSignupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SignupIpRateThrottle, SignupEmailRateThrottle]

    @transaction.atomic
    def post(self, request):
        company_name = str(request.data.get("company_name", "")).strip()
        company_code = _build_company_code(company_name, request.data.get("company_code", ""))
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        captcha_token = request.data.get("captcha_token", "")
        ip_address = _client_ip(request)

        if not company_name or not company_code or not username or not password or not email:
            return Response(
                {"detail": "Empresa, codigo, email, usuario y contrasena son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"detail": "La contrasena debe tener al menos 8 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "@" not in email or "." not in email.split("@")[-1]:
            return Response({"detail": "Email invalido."}, status=status.HTTP_400_BAD_REQUEST)

        if not _verify_turnstile(captcha_token, ip_address):
            return Response(
                {"detail": "No se pudo validar anti-spam. Reintenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Company.objects.filter(code__iexact=company_code).exists():
            return Response(
                {"detail": "El codigo de empresa ya existe. Elige otro."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"detail": "El usuario ya existe. Elige otro."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if UserCompany.objects.filter(user__email__iexact=email).exists():
            return Response(
                {"detail": "Este email ya tiene una empresa gratis. Para ampliar, contactanos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        company = Company.objects.create(name=company_name, code=company_code)
        user = User.objects.create_user(username=username, password=password, email=email, is_active=True)
        UserCompany.objects.create(user=user, company=company, role=UserCompany.Role.OWNER)

        refresh = RefreshToken.for_user(user)
        refresh["company_id"] = company.id
        refresh["company_code"] = company.code

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "code": company.code,
                },
                "role": UserCompany.Role.OWNER,
                "plan": {
                    "name": "free",
                    "max_skus": FREE_PLAN_MAX_SKUS,
                    "upgrade_contact": SUPPORT_CONTACT,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_user_company_link(request.user)
        company = membership.company if membership else None
        if not membership or not company:
            return Response({"detail": "Usuario sin empresa asignada."}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "user": {
                    "id": request.user.id,
                    "username": request.user.username,
                },
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "code": company.code,
                },
                "role": membership.role,
            },
            status=status.HTTP_200_OK,
        )


class CompanyUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_user_company_link(request.user)
        if not membership:
            return Response({"detail": "Usuario sin empresa asignada."}, status=status.HTTP_403_FORBIDDEN)
        if not has_any_role(request.user, [UserCompany.Role.OWNER, UserCompany.Role.ADMIN]):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        rows = UserCompany.objects.select_related("user", "company").filter(company=membership.company).order_by("user__username")
        return Response(
            [
                {
                    "id": row.user.id,
                    "username": row.user.username,
                    "role": row.role,
                    "company_code": row.company.code,
                }
                for row in rows
            ],
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        membership = get_user_company_link(request.user)
        if not membership:
            return Response({"detail": "Usuario sin empresa asignada."}, status=status.HTTP_403_FORBIDDEN)
        if not has_any_role(request.user, [UserCompany.Role.OWNER, UserCompany.Role.ADMIN]):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", "")).strip()
        role = str(request.data.get("role", UserCompany.Role.OPERATOR)).strip().lower()

        allowed_roles = {r for r, _ in UserCompany.Role.choices}
        if role not in allowed_roles:
            return Response({"detail": "Rol invalido."}, status=status.HTTP_400_BAD_REQUEST)
        if role == UserCompany.Role.OWNER and not has_any_role(request.user, [UserCompany.Role.OWNER]):
            return Response({"detail": "Solo owner puede crear otro owner."}, status=status.HTTP_403_FORBIDDEN)
        if not username or not password:
            return Response({"detail": "Usuario y contrasena son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response({"detail": "El usuario ya existe."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, is_active=True)
        UserCompany.objects.create(user=user, company=membership.company, role=role)

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "role": role,
                "company_code": membership.company.code,
            },
            status=status.HTTP_201_CREATED,
        )
