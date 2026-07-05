import json
import io
import re
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from django.conf import settings
from django.contrib.auth.models import User
from .models import Transaction
from .serializers import TransactionSerializer

def _extract_json(text):
    """Robustly extract and parse a JSON object from text containing potential code fences or conversational text."""
    text_clean = text.strip()
    try:
        return json.loads(text_clean)
    except json.JSONDecodeError:
        pass

    # Match anything between ```json ... ``` or ``` ... ```
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text_clean)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Fallback to finding the first '{' and last '}'
    start = text_clean.find('{')
    end = text_clean.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text_clean[start:end+1])
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Could not locate a valid JSON object in model response", text_clean, 0)

# ─── Shared Demo User ─────────────────────────────────────────────────────────
# No authentication. All requests use a single shared "snaply" user.

def _get_demo_user():
    user, _ = User.objects.get_or_create(
        username='snaply',
        defaults={'email': 'snaply@app.local', 'is_staff': False}
    )
    return user


# ─── Gemini Setup ─────────────────────────────────────────────────────────────

def _get_gemini_client():
    try:
        from google import genai
    except ImportError:
        raise RuntimeError("google-genai package is not installed.")

    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured on the server.")

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


# ─── Parse Receipt ────────────────────────────────────────────────────────────

@api_view(['POST'])
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
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=2048,
            )
        )
        parsed_data = _extract_json(response.text)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except json.JSONDecodeError:
        return Response(
            {"error": "AI returned unreadable data. Try a clearer image."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        err_msg = str(e)
        if 'API_KEY' in err_msg or 'api key' in err_msg.lower():
            return Response(
                {"error": "Gemini API key is invalid. Contact the app owner."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if 'quota' in err_msg.lower() or 'limit' in err_msg.lower():
            return Response(
                {"error": "API quota exceeded. Try again in a few minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        return Response(
            {"error": f"Parsing failed: {err_msg}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    user = _get_demo_user()
    created = []
    for t in parsed_data.get('transactions', []):
        if not t.get('item'):
            continue
        txn = Transaction.objects.create(
            user=user,
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
            {"error": "No items found in this receipt. Try a clearer photo."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    return Response(
        TransactionSerializer(created, many=True).data,
        status=status.HTTP_201_CREATED
    )


# ─── Transactions ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_transactions(request):
    user = _get_demo_user()
    txns = Transaction.objects.filter(user=user).order_by('-created_at')
    return Response(TransactionSerializer(txns, many=True).data)


@api_view(['POST'])
def clear_transactions(request):
    user = _get_demo_user()
    Transaction.objects.filter(user=user).delete()
    return Response({"message": "All transactions cleared."})


# ─── Utility ──────────────────────────────────────────────────────────────────

from django.core.management import call_command

@api_view(['POST'])
def seed_database(request):
    call_command('seed_data')
    return Response({"message": "Database seeded successfully."})


@api_view(['GET'])
def api_index(request):
    return Response({
        "status": "Snaply API is online",
        "version": "2.0.0",
        "auth": "none — open access, no login required",
    })
