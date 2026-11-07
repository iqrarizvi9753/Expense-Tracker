import json
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import FileResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import CustomUser, Transaction

BASE_DIR = Path(settings.BASE_DIR)


def index(request):
    index_file = BASE_DIR / "index.html"
    return FileResponse(open(index_file, "rb"), content_type="text/html")


@csrf_exempt
@require_http_methods(["POST"])
def signup(request):
    payload = json.loads(request.body or b"{}")
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()

    if not name or not email or not password:
        return JsonResponse({"error": "Name, email, and password are required."}, status=400)

    try:
        user = CustomUser.objects.create_user(username=email, email=email, password=password, first_name=name)
    except IntegrityError:
        return JsonResponse({"error": "A user with this email already exists."}, status=409)

    login(request, user)
    return JsonResponse(
        {
            "message": "Account created successfully.",
            "user": {"id": user.id, "name": user.first_name or user.username, "email": user.email, "budget": float(user.budget or 0)},
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def signin(request):
    payload = json.loads(request.body or b"{}")
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "Incorrect email or password."}, status=401)

    login(request, user)
    return JsonResponse(
        {
            "message": "Signed in successfully.",
            "user": {"id": user.id, "name": user.first_name or user.username, "email": user.email, "budget": float(user.budget or 0)},
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out successfully."})


@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({"status": "ok", "database": "sqlite"})


@login_required
@require_http_methods(["GET"])
def dashboard(request):
    user = request.user
    transactions = list(
        Transaction.objects.filter(user=user).order_by("-date", "-time", "-id").values(
            "id", "title", "amount", "category", "type", "date", "time"
        )
    )
    normalized = []
    for row in transactions:
        normalized.append(
            {
                "id": row["id"],
                "title": row["title"],
                "amount": float(row["amount"]),
                "category": row["category"],
                "type": row["type"],
                "date": str(row["date"]),
                "time": str(row["time"]),
            }
        )
    return JsonResponse(
        {
            "user": {"id": user.id, "name": user.first_name or user.username, "email": user.email, "budget": float(user.budget or 0)},
            "transactions": normalized,
            "budget": float(user.budget or 0),
        }
    )


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def create_transaction(request):
    payload = json.loads(request.body or b"{}")
    title = (payload.get("title") or "").strip()
    amount = payload.get("amount")
    category = (payload.get("category") or "Other").strip()
    type_value = (payload.get("type") or "expense").strip().lower()
    date_value = (payload.get("date") or "").strip()
    time_value = (payload.get("time") or "00:00").strip()

    if not title or amount is None or not date_value:
        return JsonResponse({"error": "Title, amount, and date are required."}, status=400)

    try:
        amount_value = Decimal(str(amount))
    except Exception:
        return JsonResponse({"error": "Amount must be a valid number."}, status=400)

    if amount_value <= 0:
        return JsonResponse({"error": "Amount must be greater than zero."}, status=400)

    Transaction.objects.create(
        user=request.user,
        title=title,
        amount=amount_value,
        category=category,
        type=type_value,
        date=date_value,
        time=time_value,
    )
    return JsonResponse({"message": "Transaction saved successfully."})


@login_required
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_transaction(request, transaction_id):
    deleted, _ = Transaction.objects.filter(user=request.user, id=transaction_id).delete()
    if deleted == 0:
        return JsonResponse({"error": "Transaction not found."}, status=404)
    return JsonResponse({"message": "Transaction deleted successfully."})


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def set_budget(request):
    payload = json.loads(request.body or b"{}")
    value = payload.get("budget")
    try:
        budget_value = Decimal(str(value))
    except Exception:
        return JsonResponse({"error": "Budget must be a valid number."}, status=400)

    if budget_value < 0:
        return JsonResponse({"error": "Budget cannot be negative."}, status=400)

    request.user.budget = budget_value
    request.user.save(update_fields=["budget"])
    return JsonResponse({"message": "Budget updated successfully.", "budget": float(budget_value)})


def favicon(request):
    return JsonResponse({"status": "ok"})
