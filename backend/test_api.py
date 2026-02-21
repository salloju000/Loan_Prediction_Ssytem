"""
test_api.py — Integration tests for FastAPI endpoints.

Tests:
  GET  /          — root endpoint
  GET  /health    — health check with and without model
  POST /predict   — model not loaded (503), valid request (200), invalid input (422)
"""

from __future__ import annotations

from fastapi.testclient import TestClient


# ── GET / ─────────────────────────────────────────────────────────────────────


class TestRoot:
    def test_returns_200(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_has_service_key(self, client: TestClient):
        data = client.get("/").json()
        assert "service" in data
        assert data["service"] == "Loan Prediction API"

    def test_model_not_loaded_reflected(self, client: TestClient):
        data = client.get("/").json()
        assert data["model_loaded"] is False


# ── GET /health ───────────────────────────────────────────────────────────────


class TestHealth:
    def test_503_when_model_not_loaded(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 503

    def test_degraded_status_when_model_not_loaded(self, client: TestClient):
        data = client.get("/health").json()
        assert data["status"] == "degraded"
        assert data["model_loaded"] is False

    def test_200_when_model_loaded(self, client_with_mock_predictor: TestClient):
        resp = client_with_mock_predictor.get("/health")
        assert resp.status_code == 200

    def test_ok_status_when_model_loaded(self, client_with_mock_predictor: TestClient):
        data = client_with_mock_predictor.get("/health").json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True

    def test_has_version_field(self, client: TestClient):
        data = client.get("/health").json()
        assert "version" in data


# ── POST /predict ─────────────────────────────────────────────────────────────


class TestPredict:
    def test_503_when_model_not_loaded(
        self, client: TestClient, valid_personal_loan_payload: dict
    ):
        resp = client.post("/predict", json=valid_personal_loan_payload)
        assert resp.status_code == 503

    def test_200_with_valid_payload(
        self,
        client_with_mock_predictor: TestClient,
        valid_personal_loan_payload: dict,
    ):
        resp = client_with_mock_predictor.post(
            "/predict", json=valid_personal_loan_payload
        )
        assert resp.status_code == 200

    def test_response_has_approved_field(
        self,
        client_with_mock_predictor: TestClient,
        valid_personal_loan_payload: dict,
    ):
        data = client_with_mock_predictor.post(
            "/predict", json=valid_personal_loan_payload
        ).json()
        assert "approved" in data
        assert isinstance(data["approved"], bool)

    def test_response_has_breakdown(
        self,
        client_with_mock_predictor: TestClient,
        valid_personal_loan_payload: dict,
    ):
        data = client_with_mock_predictor.post(
            "/predict", json=valid_personal_loan_payload
        ).json()
        assert "breakdown" in data
        assert "financial_health" in data["breakdown"]
        assert "credit_profile" in data["breakdown"]

    def test_422_for_missing_required_field(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        payload = {k: v for k, v in valid_personal_loan_payload.items() if k != "age"}
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_422_for_invalid_loan_type(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        payload = {**valid_personal_loan_payload, "loan_type": "invalidType"}
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_422_for_age_out_of_range(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        payload = {**valid_personal_loan_payload, "age": 200}
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_422_for_credit_score_out_of_range(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        payload = {**valid_personal_loan_payload, "credit_score": 1000}
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_422_for_negative_income(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        payload = {**valid_personal_loan_payload, "monthly_income": -1}
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_car_loan_requires_vehicle_price(
        self, client_with_mock_predictor: TestClient, valid_personal_loan_payload: dict
    ):
        """Home loan requires vehicle_price for car — Pydantic validator should catch this."""
        payload = {**valid_personal_loan_payload, "loan_type": "carLoan"}
        # vehicle_price is conditionally required for car loans
        resp = client_with_mock_predictor.post("/predict", json=payload)
        assert resp.status_code == 422
