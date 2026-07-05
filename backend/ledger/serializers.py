from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'item', 'quantity', 'price', 'payment_method', 'category', 'source_type', 'created_at']
