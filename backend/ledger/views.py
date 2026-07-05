import json
import base64
import io
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Transaction
from .serializers import TransactionSerializer

# ─── Gemini Setup ────────────────────────────────────────────────────────────
# Uses the official google-genai SDK (google-genai package).
# Key is read lazily so auth endpoints never crash if key is missing.

def _get_gemini_client():
    """Return a configured Gemini client. Raises ValueError if key is missing."""
    try:
        from google import genai
    except ImportError:
        raise RuntimeError("google-genai package is not installed.")

    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your Render environment variables."
        )

    return genai.Client(api_key=api_key)


SYSTEM_PROMPT = """You are a receipt parser for small Indian businesses.
Extract ALL line items from the receipt image or text provided.
Return ONLY valid JSON — no markdown fences, no commentary, no extra text.

Required JSON schema:
{
  "transactions": [
    {"item": "string", "qty": number, "price": number, "category": "string"}
  ],
  "total": number,
  "payment_method": "cash" | "upi" | "card" | "unknown"
}

Category must be one of: Food, Stationery, Utilities, Travel, Electronics, Clothing, General.
Price should be the UNIT price (not total for that line).
If input is unreadable, return: {"transactions": [], "total": 0, "payment_method": "unknown"}"""


# ─── Auth Views ──────────────────────────────────────────────────────────────

@api_view(['POST'])
def register_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    email    = request.data.get('email', '').strip()

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already taken. Please choose another."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(username=username, password=password, email=email)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token":    token.key,
        "username": user.username,
        "is_staff": user.is_staff
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {"error": "Incorrect username or password."},
            status=status.HTTP_400_BAD_REQUEST
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token":    token.key,
        "username": user.username,
        "is_staff": user.is_staff
    })


# ─── Parse Receipt (AI) ──────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_input(request):
    image_file = request.FILES.get('image')
    text_input = request.data.get('text', '').strip()
    source_type = 'text'

    if not image_file and not text_input:
        return Response(
            {"error": "Please provide an image or text to parse."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from google import genai as google_genai
        from google.genai import types as genai_types

        client = _get_gemini_client()

        if image_file:
            source_type = 'image'
            from PIL import Image as PILImage
            img_bytes = image_file.read()
            img = PILImage.open(io.BytesIO(img_bytes))
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            img_bytes = buf.getvalue()

            contents = [
                genai_types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg'),
                "Extract ALL items from this receipt. " + SYSTEM_PROMPT
            ]
        else:
            contents = f"Parse this receipt text:\n{text_input}\n\n{SYSTEM_PROMPT}"

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=1024,
            )
        )
        raw = response.text.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        parsed_data = json.loads(raw)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except json.JSONDecodeError:
        return Response(
            {"error": "AI returned unreadable data. Please try a clearer image."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        err_msg = str(e)
        if 'API_KEY' in err_msg or 'api key' in err_msg.lower() or 'API_KEY_INVALID' in err_msg:
            return Response(
                {"error": "Gemini API key is invalid. Please contact the app admin."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if 'quota' in err_msg.lower() or 'limit' in err_msg.lower():
            return Response(
                {"error": "API quota exceeded. Please try again in a few minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        return Response(
            {"error": f"Receipt parsing failed: {err_msg}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Save parsed transactions to DB
    created = []
    for t in parsed_data.get('transactions', []):
        if not t.get('item'):
            continue
        txn = Transaction.objects.create(
            user=request.user,
            item=t['item'],
            quantity=t.get('qty', 1),
            price=t.get('price', 0),
            payment_method=parsed_data.get('payment_method', 'unknown'),
            category=t.get('category', 'General'),
            source_type=source_type
        )
        created.append(txn)

    if not created:
        return Response(
            {"error": "No items could be extracted from this receipt. Try a clearer photo."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    return Response(
        TransactionSerializer(created, many=True).data,
        status=status.HTTP_201_CREATED
    )


# ─── Transaction Views ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    txns = Transaction.objects.filter(user=request.user).order_by('-created_at')
    return Response(TransactionSerializer(txns, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_transactions(request):
    Transaction.objects.filter(user=request.user).delete()
    return Response({"message": "All transactions cleared successfully"})


# ─── Admin Views ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_metrics(request):
    if not request.user.is_staff:
        return Response(
            {"error": "Admin access required"},
            status=status.HTTP_403_FORBIDDEN
        )

    all_txns = Transaction.objects.all()
    total_revenue = sum(float(t.price) * t.quantity for t in all_txns)

    sources = {}
    for t in all_txns:
        sources[t.source_type] = sources.get(t.source_type, 0) + 1

    payments = {}
    for t in all_txns:
        payments[t.payment_method] = payments.get(t.payment_method, 0) + 1

    return Response({
        "total_users":        User.objects.count(),
        "total_transactions": all_txns.count(),
        "total_revenue":      total_revenue,
        "source_breakdown":   sources,
        "payment_breakdown":  payments,
    })


# ─── Utility Views ───────────────────────────────────────────────────────────

from django.core.management import call_command

@api_view(['POST'])
def seed_database(request):
    call_command('seed_data')
    return Response({"message": "Database seeded successfully"})


@api_view(['GET'])
def api_index(request):
    return Response({
        "status":  "Snaply API is online",
        "version": "1.0.0",
        "note":    "Users do not need API keys. The Gemini key is server-side only.",
        "endpoints": {
            "register":          "/api/auth/register/",
            "login":             "/api/auth/login/",
            "parse_receipt":     "/api/parse/",
            "transactions":      "/api/transactions/",
            "clear_transactions":"/api/transactions/clear/",
            "admin_metrics":     "/api/admin/metrics/",
            "seed":              "/api/seed/",
        }
    })
