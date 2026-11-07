from django.test import TestCase, override_settings
from django.urls import reverse


@override_settings(SECURE_SSL_REDIRECT=False)
class ExpenseTrackerApiTests(TestCase):
    def test_health_endpoint_exists(self):
        response = self.client.get(reverse("health_check"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("status", response.json())

    def test_root_page_serves_html(self):
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Finora")

    def test_dashboard_page_serves_html(self):
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Finora")

        response_with_slash = self.client.get("/dashboard/")
        self.assertEqual(response_with_slash.status_code, 200)
        self.assertContains(response_with_slash, "Finora")

    def test_missing_api_route_returns_json_404(self):
        response = self.client.get("/api/does-not-exist")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "Endpoint not found.")

    def test_wrong_http_method_on_api_route_returns_json_405(self):
        response = self.client.get("/api/signup")
        self.assertEqual(response.status_code, 405)
        self.assertEqual(response.json()["error"], "This endpoint does not allow that HTTP method.")
