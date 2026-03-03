from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Company, UserCompany
from .tenancy import get_user_company


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        company_code = str(request.data.get("company", "")).strip().lower()
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", "")).strip()

        if not company_code or not username or not password:
            return Response(
                {"detail": "Empresa, usuario y contrasena son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        company = Company.objects.filter(code__iexact=company_code).first()
        if not company:
            return Response(
                {"detail": "Empresa inexistente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request, username=username, password=password)
        if not user:
            return Response(
                {"detail": "Credenciales invalidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        membership = UserCompany.objects.filter(user=user, company=company).first()
        if not membership:
            return Response(
                {"detail": "El usuario no pertenece a la empresa indicada."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_user_company(request.user)
        if not company:
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
            },
            status=status.HTTP_200_OK,
        )
