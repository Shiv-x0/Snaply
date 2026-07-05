from django.db import models
from django.contrib.auth.models import User


class Transaction(models.Model):
    PAYMENT_METHODS = [('cash', 'Cash'), ('upi', 'UPI'), ('card', 'Card'), ('unknown', 'Unknown')]
    SOURCE_TYPES = [('text', 'Text'), ('image', 'Image'), ('voice', 'Voice'), ('seed', 'Seed')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    item = models.CharField(max_length=200)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, default='unknown')
    category = models.CharField(max_length=100, blank=True, default="General")
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES, default='text')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item} x{self.quantity} - {self.price}"


