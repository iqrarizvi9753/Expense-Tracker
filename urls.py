from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.static import serve

from tracker.views import index


def api_not_found(request, exception=None):
    if request.path.startswith("/api/"):
        return JsonResponse({"error": "Endpoint not found.", "message": "Endpoint not found."}, status=404)
    return index(request)


def api_method_not_allowed(request, exception=None):
    if request.path.startswith("/api/"):
        return JsonResponse({"error": "This endpoint does not allow that HTTP method.", "message": "This endpoint does not allow that HTTP method."}, status=405)
    return JsonResponse({"error": "Method not allowed."}, status=405)


handler404 = api_not_found
handler405 = api_method_not_allowed

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("tracker.urls")),
    path("styles.css", serve, {"document_root": settings.BASE_DIR, "path": "styles.css"}),
    path("app.js", serve, {"document_root": settings.BASE_DIR, "path": "app.js"}),
]
