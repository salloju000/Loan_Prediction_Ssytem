"""
test_schemas.py — Unit tests for Pydantic request/response schemas.

Tests LoanPredictRequest validators:
  - Valid request passes validation
  - Field range validators (age, credit_score, income, etc.)
  - Conditional field validators (loan-type-specific fields)
  - Cross-field validators (existing EMIs < income)
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas import LoanPredictRequest


def make_valid_request(**overrides) -> dict:
    """Return a minimal valid personal loan request dict."""
    base = {
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
    base.update(overrides)
    return base


# ── Valid request ─────────────────────────────────────────────────────────────


class TestValidRequest:
    def test_personal_loan_validates_successfully(self):
        req = LoanPredictRequest(**make_valid_request())
        assert req.loan_amount_requested == 500000

    def test_name_is_optional(self):
        """name field should be optional — omitting it should not raise."""
        req = LoanPredictRequest(**make_valid_request())
        assert req.name is None

    def test_name_is_stored_when_provided(self):
        req = LoanPredictRequest(**make_valid_request(name="Rohan Sharma"))
        assert req.name == "Rohan Sharma"

    def test_coapplicant_income_defaults_to_zero(self):
        data = make_valid_request()
        data.pop("coapplicant_income", None)
        req = LoanPredictRequest(**data)
        assert req.coapplicant_income == 0


# ── Field range validators ────────────────────────────────────────────────────


class TestFieldRanges:
    def test_age_below_minimum_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(age=17))

    def test_age_above_maximum_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(age=100))

    def test_valid_age_passes(self):
        req = LoanPredictRequest(**make_valid_request(age=25))
        assert req.age == 25

    def test_credit_score_below_300_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(credit_score=100))

    def test_credit_score_above_900_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(credit_score=950))

    def test_valid_credit_score_passes(self):
        req = LoanPredictRequest(**make_valid_request(credit_score=750))
        assert req.credit_score == 750

    def test_zero_income_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(monthly_income=0))

    def test_negative_income_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(monthly_income=-1))

    def test_invalid_loan_type_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(loan_type="invalidLoan"))

    def test_invalid_gender_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(gender="Other"))

    def test_invalid_employment_type_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(employment_type="Unemployed"))


# ── Cross-field validators ────────────────────────────────────────────────────


class TestCrossFieldValidators:
    def test_existing_emis_exceeding_income_raises(self):
        """existing_emis should be less than monthly_income."""
        with pytest.raises(ValidationError):
            LoanPredictRequest(
                **make_valid_request(
                    monthly_income=30000,
                    existing_emis=35000,  # exceeds income
                )
            )

    def test_existing_emis_equal_to_income_raises(self):
        with pytest.raises(ValidationError):
            LoanPredictRequest(
                **make_valid_request(
                    monthly_income=30000,
                    existing_emis=30000,
                )
            )

    def test_existing_emis_below_income_passes(self):
        req = LoanPredictRequest(
            **make_valid_request(
                monthly_income=50000,
                existing_emis=10000,
            )
        )
        assert req.existing_emis == 10000


# ── Conditional loan-type fields ──────────────────────────────────────────────


class TestConditionalFields:
    def test_car_loan_requires_vehicle_price(self):
        """vehicle_price is required when loan_type is carLoan."""
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(loan_type="carLoan"))

    def test_car_loan_with_vehicle_price_passes(self):
        req = LoanPredictRequest(
            **make_valid_request(
                loan_type="carLoan",
                vehicle_price=800000,
            )
        )
        assert req.vehicle_price == 800000

    def test_home_loan_requires_property_value(self):
        """property_value is required when loan_type is homeLoan."""
        with pytest.raises(ValidationError):
            LoanPredictRequest(**make_valid_request(loan_type="homeLoan"))

    def test_home_loan_with_property_value_passes(self):
        req = LoanPredictRequest(
            **make_valid_request(
                loan_type="homeLoan",
                property_value=5000000,
            )
        )
        assert req.property_value == 5000000

    def test_education_loan_requires_course_type(self):
        """course_type is required when loan_type is educationLoan."""
        with pytest.raises(ValidationError):
            LoanPredictRequest(
                **make_valid_request(
                    loan_type="educationLoan",
                    institution_tier="Tier-1",
                )
            )

    def test_personal_loan_needs_no_specific_fields(self):
        """Personal loans pass with only base fields."""
        req = LoanPredictRequest(**make_valid_request(loan_type="personalLoan"))
        assert req.loan_type.value == "personalLoan"
