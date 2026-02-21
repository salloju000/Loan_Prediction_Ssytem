"""
conftest.py — Shared pytest fixtures for backend tests.

Provides:
  - `client`: A TestClient for the FastAPI app with the model unloaded
    (most tests don't need a real 173 MB model).
  - `client_with_mock_predictor`: A client where app.state.predictor is
    replaced with a lightweight MagicMock to simulate a loaded model.
"""
from __future__ import annotations

from typing import Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI test client — predictor is None (model not loaded)."""
    app.state.predictor = None
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def mock_predictor_result() -> dict:
    """A minimal valid predictor result dict (mirrors LoanPredictor.predict output)."""
    return {
        "status": "success",
        "approved": True,
        "approval_probability": 78.5,
        "loan_grade": "B  (Good)",
        "sanctioned_amount": 440000,
        "sanction_ratio": 88.0,
        "monthly_emi": 9123.45,
        "rejection_reasons": [],
        "breakdown": {
            "financial_health": {
                "total_monthly_income": "₹50,000",
                "existing_monthly_emis": "₹0",
                "projected_new_emi": "₹9,123",
                "free_monthly_income": "₹40,877",
                "debt_to_income_ratio": "18.25%",
                "emi_to_income_ratio": "18.25%",
            },
            "credit_profile": {
                "credit_score": 720,
                "credit_score_band": "Good",
                "existing_loans": 0,
                "is_high_risk_flag": False,
            },
            "loan_metrics": {
                "amount_requested": "₹5,00,000",
                "tenure": "60 months (5 yrs 0 mo)",
                "loan_to_income_ratio": "0.83x",
                "sanctioned_amount": "₹4,40,000",
                "monthly_emi_if_approved": "₹9,123",
            },
            "approval_confidence": "High",
        },
    }


@pytest.fixture
def client_with_mock_predictor(
    mock_predictor_result: dict,
) -> Generator[TestClient, None, None]:
    """FastAPI test client with a mock predictor that returns a successful result."""
    mock = MagicMock()
    mock.predict.return_value = mock_predictor_result
    app.state.predictor = mock
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.state.predictor = None


@pytest.fixture
def valid_personal_loan_payload() -> dict:
    """Minimal valid POST /predict payload for a personal loan."""
    return {
        "loan_type": "personalLoan",
        "gender": "Male",
        "age": 30,
        "marital_status": "Single",
        "dependents": 0,
        "education": "Graduate",
        "employment_type": "Salaried",
        "years_of_experience": 5,
        "monthly_income": 50000,
        "coapplicant_income": 0,
        "credit_score": 720,
        "existing_emis": 0,
        "existing_loans_count": 0,
        "property_area": "Urban",
        "loan_amount_requested": 500000,
        "loan_tenure_months": 60,
    }
