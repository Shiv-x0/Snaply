from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from ledger.models import Transaction
from django.utils import timezone
from datetime import timedelta
import random

class Command(BaseCommand):
    help = 'Seeds the database with realistic demo data, standard and admin users'

    def handle(self, *args, **kwargs):
        # 1. Clean existing database
        Transaction.objects.all().delete()
        User.objects.all().delete()
        Token.objects.all().delete()
        
        self.stdout.write("Cleared existing data.")

        # 2. Create standard user: alex
        alex = User.objects.create_user(
            username='alex',
            email='alex@snaply.com',
            password='password123'
        )
        alex_token, _ = Token.objects.get_or_create(user=alex)
        self.stdout.write(self.style.SUCCESS(f"Created standard user 'alex' (password: password123). Token: {alex_token.key}"))

        # 3. Create admin user: admin
        admin = User.objects.create_user(
            username='admin',
            email='admin@snaply.com',
            password='password123',
            is_staff=True,
            is_superuser=True
        )
        admin_token, _ = Token.objects.get_or_create(user=admin)
        self.stdout.write(self.style.SUCCESS(f"Created admin user 'admin' (password: password123). Token: {admin_token.key}"))

        # 4. Seed transactions for standard user 'alex'
        items = [
            ("Masala Chai", 20, "Food"), ("Espresso", 150, "Food"), ("Sandwich", 100, "Food"),
            ("Cake Slice", 80, "Food"), ("Pen", 15, "Stationery"), ("Notebook", 50, "Stationery"),
            ("Office Desk Lamp", 450, "Office Utilities"), ("Internet Bill", 799, "Utilities"),
            ("Cab Ride", 220, "Travel")
        ]
        methods = ['cash', 'upi', 'card']

        now = timezone.now()
        count = 0
        for i in range(3):
            # i days ago
            date = now - timedelta(days=i)
            # Seed 5 to 12 transactions per day for alex
            for _ in range(random.randint(5, 12)):
                item, price, cat = random.choice(items)
                qty = random.randint(1, 4)
                
                txn = Transaction.objects.create(
                    user=alex,
                    item=item,
                    quantity=qty,
                    price=price * qty,
                    payment_method=random.choice(methods),
                    category=cat,
                    source_type='seed'
                )
                
                # Override the auto_now_add field
                seeded_date = date.replace(hour=random.randint(9, 20), minute=random.randint(0, 59))
                Transaction.objects.filter(id=txn.id).update(created_at=seeded_date)
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} demo transactions for user alex!'))
