import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Case, When, Value, DecimalField, F, ExpressionWrapper
from django.utils import timezone
from rest_framework import serializers

from .models import Movement, AuditLog

logger = logging.getLogger("inventory")

POSITIVE_TYPES = {
    Movement.MovementType.PURCHASE,
    Movement.MovementType.RETURN,
    Movement.MovementType.ADJUSTMENT,
}
NEGATIVE_TYPES = {Movement.MovementType.SALE}


def calculate_stock(product, deposit=None):
    filters = {"product": product}
    if deposit:
        filters["deposit"] = deposit

    signed_quantity = Case(
        When(movement_type__in=POSITIVE_TYPES, then=F("quantity")),
        When(
            movement_type__in=NEGATIVE_TYPES,
            then=ExpressionWrapper(-1 * F("quantity"), output_field=DecimalField()),
        ),
        default=Value(0),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )

    total = (
        Movement.objects.filter(**filters)
        .annotate(signed_quantity=signed_quantity)
        .aggregate(total=Sum("signed_quantity"))
        .get("total")
    )

    return total or Decimal("0")


@transaction.atomic
def register_movement(user, data):
    product = data["product"]
    deposit = data["deposit"]
    movement_type = data["movement_type"]
    quantity = data["quantity"]
    cost = data.get("cost", Decimal("0"))

    sign = Decimal("1") if movement_type in POSITIVE_TYPES else Decimal("-1")
    signed_quantity = quantity * sign
    current_stock = calculate_stock(product, deposit)
    new_stock = current_stock + signed_quantity

    if new_stock < 0:
        raise serializers.ValidationError(
            "No hay stock suficiente para completar el movimiento."
        )

    if sign > 0 and quantity > 0:
        current_total_stock = calculate_stock(product)
        total_value = (product.average_cost * current_total_stock) + (
            quantity * cost
        )
        new_total_stock = current_total_stock + quantity
        if new_total_stock > 0:
            product.average_cost = total_value / new_total_stock
            product.save(update_fields=["average_cost"])

    if sign < 0 and cost == 0:
        cost = product.average_cost

    movement = Movement.objects.create(
        product=product,
        deposit=deposit,
        movement_type=movement_type,
        quantity=quantity,
        cost=cost,
        notes=data.get("notes", ""),
        user=user,
    )

    AuditLog.objects.create(
        action="Movimiento registrado",
        user=user,
        metadata={
            "product": product.sku,
            "deposit": deposit.name,
            "movement_type": movement_type,
            "quantity": str(quantity),
            "timestamp": timezone.now().isoformat(),
        },
    )

    logger.info(
        "Movimiento registrado | producto=%s deposito=%s tipo=%s cantidad=%s",
        product.sku,
        deposit.name,
        movement_type,
        quantity,
    )

    return movement
