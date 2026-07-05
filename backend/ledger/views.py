import json
import base64
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from openai import OpenAI
from .models import Transaction
from .serializers import TransactionSerializer

# NOTE (approved deviation from BUILD.md): provider is Google Gemini API (OpenAI-compatible),
# not Zhipu/OpenAI. Same SDK, same code path -- only base_url + model names differ.
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=GEMINI_BASE_URL,
)

SYSTEM_PROMPT = """
You are a data extraction bot for small Indian businesses. Extract ledger transactions from the provided input.
Return ONLY valid JSON matching this exact schema. No markdown fences, no commentary, no extra text.
Schema:
{
  "transactions": [{"item": "string", "qty": number, "price": number, "category": "string"}],
  "total": number,
  "payment_method": "cash" | "upi" | "card" | "unknown"
}
If the input is garbled or empty, return: {"transactions": [], "total": 0, "payment_method": "unknown"}
"""

@api_view(['POST'])
def register_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email = request.data.get('email', '').strip()
    
    if not username or not password:
        return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.create_user(username=username, password=password, email=email)
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        "token": token.key,
        "username": user.username,
        "is_staff": user.is_staff
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def login_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    
    if not username or not password:
        return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        "token": token.key,
        "username": user.username,
        "is_staff": user.is_staff
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_metrics(request):
    if not request.user.is_staff:
        return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
    total_users = User.objects.count()
    total_transactions = Transaction.objects.count()
    
    # Calculate total revenue
    all_txns = Transaction.objects.all()
    total_revenue = sum(float(t.price) * t.quantity for t in all_txns)
    
    # Source type breakdown
    sources = {'text': 0, 'image': 0, 'voice': 0, 'seed': 0}
    for t in all_txns:
        src = t.source_type
        sources[src] = sources.get(src, 0) + 1
        
    # Payment method breakdown
    payment_methods = {'cash': 0, 'upi': 0, 'card': 0, 'unknown': 0}
    for t in all_txns:
        pm = t.payment_method
        payment_methods[pm] = payment_methods.get(pm, 0) + 1
        
    return Response({
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_revenue": total_revenue,
        "source_breakdown": sources,
        "payment_breakdown": payment_methods
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_input(request):
    text_input = request.data.get('text', '').strip()
    image_file = request.FILES.get('image')
    source_type = 'text'

    if not text_input and not image_file:
        return Response({"error": "No text or image provided"}, status=status.HTTP_400_BAD_REQUEST)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if image_file:
        source_type = 'image'
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract the items, quantities, prices, and payment method from this receipt image."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
            ]
        })
    else:
        messages.append({"role": "user", "content": text_input})

    try:
        # Gemini 2.5 Flash supports both text and multimodal image inputs
        model = "gemini-2.5-flash"
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.0,
            max_tokens=1000
        )

        raw_content = response.choices[0].message.content.strip()
        # Fallback if AI wraps in ```json ... ```
        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        parsed_data = json.loads(raw_content)

    except json.JSONDecodeError:
        return Response({"error": "AI returned malformed data. Try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        # Catches OpenAI API timeouts, rate limits, auth errors
        return Response({"error": f"AI Processing failed: {str(e)}"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Save to DB
    created_transactions = []
    for t in parsed_data.get('transactions', []):
        if not t.get('item'): continue
        txn = Transaction.objects.create(
            user=request.user,
            item=t['item'],
            quantity=t.get('qty', 1),
            price=t.get('price', 0),
            payment_method=parsed_data.get('payment_method', 'unknown'),
            category=t.get('category', 'General'),
            source_type=source_type
        )
        created_transactions.append(txn)

    return Response(TransactionSerializer(created_transactions, many=True).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
    return Response(TransactionSerializer(transactions, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_transactions(request):
    Transaction.objects.filter(user=request.user).delete()
    return Response({"message": "All transactions cleared successfully"}, status=status.HTTP_200_OK)

from django.core.management import call_command

@api_view(['POST'])
def seed_database(request):
    call_command('seed_data')
    return Response({"message": "Database seeded successfully"}, status=status.HTTP_200_OK)

@api_view(['GET'])
def api_index(request):
    return Response({
        "status": "Snaply API is online",
        "version": "1.0.0",
        "endpoints": {
            "register": "/api/auth/register/",
            "login": "/api/auth/login/",
            "metrics": "/api/admin/metrics/",
            "parse": "/api/parse/",
            "transactions": "/api/transactions/",
            "clear_transactions": "/api/transactions/clear/",
            "seed": "/api/seed/"
        }
    })



