from django.http import JsonResponse


class ApiErrorResponseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if not request.path.startswith("/api/"):
            return response

        if response.status_code == 404:
            return JsonResponse({"error": "Endpoint not found.", "message": "Endpoint not found."}, status=404)

        if response.status_code == 405:
            return JsonResponse({"error": "This endpoint does not allow that HTTP method.", "message": "This endpoint does not allow that HTTP method."}, status=405)

        return response


class CorsHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allowed_hosts = ("localhost", "127.0.0.1", "0.0.0.0")

        if origin and any(host in origin for host in allowed_hosts):
            request_origin = origin
            response = self.get_response(request)
            response["Access-Control-Allow-Origin"] = request_origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken"
            response["Vary"] = "Origin"
            if request.method == "OPTIONS":
                response.status_code = 200
            return response

        return self.get_response(request)
