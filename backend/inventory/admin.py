from django.contrib import admin
from .models import (
    Category,
    Unit,
    Product,
    Deposit,
    Movement,
    Client,
    Supplier,
    PriceList,
    AuditLog,
)

admin.site.register(Category)
admin.site.register(Unit)
admin.site.register(Product)
admin.site.register(Deposit)
admin.site.register(Movement)
admin.site.register(Client)
admin.site.register(Supplier)
admin.site.register(PriceList)
admin.site.register(AuditLog)
