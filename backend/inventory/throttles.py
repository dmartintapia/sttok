from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle


class IpRateThrottle(SimpleRateThrottle):
    scope = "ip_auth"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginIpRateThrottle(IpRateThrottle):
    scope = "login_ip"


class SignupIpRateThrottle(IpRateThrottle):
    scope = "signup_ip"


class EmailRateThrottle(SimpleRateThrottle):
    scope = "email_auth"
    field_name = "email"

    def get_cache_key(self, request, view):
        raw = request.data.get(self.field_name)
        value = str(raw or "").strip().lower()
        if not value:
            return None
        return self.cache_format % {"scope": self.scope, "ident": value}


class LoginEmailRateThrottle(EmailRateThrottle):
    scope = "login_email"
    field_name = "username"


class SignupEmailRateThrottle(EmailRateThrottle):
    scope = "signup_email"
    field_name = "email"


def build_login_attempt_key(company_code, username, ip_address):
    return f"auth:fail:{company_code}:{username}:{ip_address}"


def get_login_failures(company_code, username, ip_address):
    key = build_login_attempt_key(company_code, username, ip_address)
    return int(cache.get(key, 0))


def register_login_failure(company_code, username, ip_address, lock_seconds):
    key = build_login_attempt_key(company_code, username, ip_address)
    current = int(cache.get(key, 0))
    cache.set(key, current + 1, timeout=lock_seconds)
    return current + 1


def clear_login_failures(company_code, username, ip_address):
    key = build_login_attempt_key(company_code, username, ip_address)
    cache.delete(key)
