"""
schemas.py — Pydantic v2 models for request validation and response serialization.
These act as the contract between the React frontend and the ML model.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Helpers ────────────────────────────────────────────────────────────────────


def sanitize_html(text: str) -> str:
    """Strip HTML tags from a string using regex."""
    if not text:
        return text
    # Remove HTML tags
    clean = re.sub(r"<[^>]*>", "", text)
    # Basic whitespace cleanup
    return " ".join(clean.split())


# ── Enums ─────────────────────────────────────────────────────────────────────


class LoanType(str, Enum):
    home = "homeLoan"
    car = "carLoan"
    bike = "bikeLoan"
    education = "educationLoan"
    personal = "personalLoan"


class Gender(str, Enum):
    male = "Male"
    female = "Female"


class MaritalStatus(str, Enum):
    single = "Single"
    married = "Married"
    divorced = "Divorced"


class Education(str, Enum):
    graduate = "Graduate"
    post_graduate = "Post-Graduate"
    undergraduate = "Undergraduate"
    diploma = "Diploma"


class EmploymentType(str, Enum):
    salaried = "Salaried"
    self_employed = "Self-Employed"
    business = "Business"
    government = "Government"
    freelancer = "Freelancer"


class PropertyArea(str, Enum):
    urban = "Urban"
    semi_urban = "Semi-Urban"
    rural = "Rural"


class CourseType(str, Enum):
    engineering = "Engineering"
    medical = "Medical"
    mba = "MBA"
    law = "Law"
    arts = "Arts"
    science = "Science"


class InstitutionTier(str, Enum):
    tier1 = "Tier-1"
    tier2 = "Tier-2"
    tier3 = "Tier-3"


# ── Annotated field types (reusable, DRY) ─────────────────────────────────────

IncomeField = Annotated[int, Field(ge=1, description="Monthly income in ₹")]
CoApplicantIncomeField = Annotated[
    int, Field(ge=0, description="Co-applicant monthly income in ₹ (0 if none)")
]
CreditScoreField = Annotated[
    int, Field(ge=300, le=900, description="CIBIL / credit score")
]
LoanAmountField = Annotated[int, Field(ge=10_000, description="Loan amount in ₹")]


# ── Loan-type-specific conditional field sets ─────────────────────────────────
# Used in model_validator to enforce cross-field rules in one place.

_LOAN_TYPE_REQUIRED_FIELDS: dict[LoanType, list[str]] = {
    LoanType.home: ["property_value"],
    LoanType.car: ["vehicle_price", "vehicle_age_years"],
    LoanType.bike: ["vehicle_price", "vehicle_age_years"],
    LoanType.education: ["course_type", "institution_tier"],
    LoanType.personal: [],
}


# ── Request Schema ─────────────────────────────────────────────────────────────


class LoanPredictRequest(BaseModel):
    """
    Full request body sent from the React frontend to POST /predict.
    All fields map exactly to what LoanPredictor.predict() expects.
    """

    # ── Applicant profile ─────────────────────────────────────────────────────
    loan_type: LoanType
    name: Optional[str] = Field(
        None, max_length=100, description="Applicant name (optional, for display only)"
    )
    age: int = Field(..., ge=18, le=70, description="Applicant age in years")
    gender: Gender = Field(Gender.male, description="Applicant gender")
    marital_status: MaritalStatus
    dependents: int = Field(0, ge=0, le=10, description="Number of dependents")
    education: Education
    employment_type: EmploymentType
    years_of_experience: int = Field(
        ..., ge=0, le=50, description="Total work experience in years"
    )
    property_area: PropertyArea

    # ── Financials ────────────────────────────────────────────────────────────
    monthly_income: IncomeField
    coapplicant_income: CoApplicantIncomeField = 0
    credit_score: CreditScoreField
    existing_emis: int = Field(
        0, ge=0, description="Total existing monthly EMI outflow in ₹"
    )
    existing_loans_count: int = Field(
        0, ge=0, le=20, description="Number of currently active loans"
    )

    # ── Loan request ──────────────────────────────────────────────────────────
    loan_amount_requested: LoanAmountField
    loan_tenure_months: int = Field(
        ..., ge=6, le=480, description="Loan tenure in months"
    )

    # ── Loan-type-specific (conditional) ─────────────────────────────────────
    property_value: Optional[int] = Field(
        None, ge=1, description="Property value in ₹ (homeLoan)"
    )
    vehicle_price: Optional[int] = Field(
        None, ge=1, description="Vehicle price in ₹ (carLoan / bikeLoan)"
    )
    vehicle_age_years: Optional[int] = Field(
        None, ge=0, le=30, description="Vehicle age in years (carLoan / bikeLoan)"
    )
    course_type: Optional[CourseType] = Field(
        None, description="Course type (educationLoan)"
    )
    institution_tier: Optional[InstitutionTier] = Field(
        None, description="Institution tier (educationLoan)"
    )

    # ── Field-level validators ────────────────────────────────────────────────

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v: Any) -> Optional[str]:
        if isinstance(v, str):
            return sanitize_html(v)
        return v

    @field_validator("existing_emis")
    @classmethod
    def existing_emis_less_than_income(cls, v: int) -> int:
        # We can't compare to monthly_income here (cross-field), but at least
        # ensure it's non-negative. Cross-field check is in model_validator.
        return v

    # ── Cross-field / model-level validators ──────────────────────────────────

    @model_validator(mode="after")
    def validate_conditional_fields(self) -> "LoanPredictRequest":
        """Enforce that loan-type-specific fields are present when required."""
        required = _LOAN_TYPE_REQUIRED_FIELDS.get(self.loan_type, [])
        missing = [f for f in required if getattr(self, f, None) is None]
        if missing:
            raise ValueError(
                f"The following fields are required for '{self.loan_type.value}': "
                + ", ".join(f"'{f}'" for f in missing)
            )
        return self

    @model_validator(mode="after")
    def total_income_must_be_positive(self) -> "LoanPredictRequest":
        """Guard against a zero total income slipping through."""
        if (self.monthly_income + self.coapplicant_income) <= 0:
            raise ValueError(
                "Total income (monthly_income + coapplicant_income) must be greater than 0"
            )
        return self

    @model_validator(mode="after")
    def loan_amount_reasonable_vs_tenure(self) -> "LoanPredictRequest":
        """Warn (via validation error) if the loan amount per month is suspiciously small."""
        monthly_instalment = self.loan_amount_requested / self.loan_tenure_months
        if monthly_instalment < 100:
            raise ValueError(
                f"Loan amount ₹{self.loan_amount_requested:,} over {self.loan_tenure_months} months "
                f"results in an unrealistically low monthly instalment (₹{monthly_instalment:.0f}). "
                "Please review the loan amount or tenure."
            )
        return self

    # ── Config ────────────────────────────────────────────────────────────────

    model_config = {
        "str_strip_whitespace": True,  # strip accidental leading/trailing spaces from string inputs
        "use_enum_values": False,  # keep enum objects (not raw strings) for type safety
        "json_schema_extra": {
            "example": {
                "loan_type": "homeLoan",
                "name": "Priya Sharma",
                "age": 35,
                "gender": "Female",
                "marital_status": "Married",
                "dependents": 2,
                "education": "Graduate",
                "employment_type": "Salaried",
                "years_of_experience": 10,
                "property_area": "Urban",
                "monthly_income": 75000,
                "coapplicant_income": 35000,
                "credit_score": 740,
                "existing_emis": 8000,
                "existing_loans_count": 1,
                "loan_amount_requested": 4000000,
                "loan_tenure_months": 240,
                "property_value": 6000000,
            }
        },
    }


# ── Response Schemas ───────────────────────────────────────────────────────────


class FinancialHealth(BaseModel):
    total_monthly_income: str
    existing_monthly_emis: str
    projected_new_emi: str
    free_monthly_income: str
    debt_to_income_ratio: str
    emi_to_income_ratio: str


class CreditProfile(BaseModel):
    credit_score: int
    credit_score_band: str
    existing_loans: int
    is_high_risk_flag: bool


class LoanMetrics(BaseModel):
    amount_requested: str
    tenure: str
    loan_to_income_ratio: str
    sanctioned_amount: str
    monthly_emi_if_approved: str


class Breakdown(BaseModel):
    financial_health: FinancialHealth
    credit_profile: CreditProfile
    loan_metrics: LoanMetrics
    approval_confidence: str


class LoanPredictResponse(BaseModel):
    """Full response returned to the React frontend after ML model prediction."""

    status: Literal["success"]  # type: ignore[valid-type]  # narrows to success-only responses
    loan_type: str
    applicant_name: str
    approved: bool
    approval_probability: float = Field(
        ..., ge=0.0, le=100.0, description="Approval probability (0–100)"
    )
    loan_grade: str = Field(
        ..., description="Grade from A+ (Excellent) to E (High Risk)"
    )
    loan_amount_requested: int = Field(..., ge=0)
    sanctioned_amount: int = Field(..., ge=0, description="0 if rejected")
    sanction_ratio: float = Field(
        ..., ge=0.0, le=100.0, description="% of requested amount sanctioned"
    )
    monthly_emi: float = Field(..., ge=0, description="Monthly EMI if approved, else 0")
    rejection_reasons: list[str]
    breakdown: Breakdown
    processing_time_ms: float = Field(
        ..., ge=0, description="Server-side inference time in ms"
    )


class ErrorResponse(BaseModel):
    """Standard error envelope returned for 4xx / 5xx responses."""

    status: Literal["error"] = "error"  # type: ignore[valid-type]
    message: str
    errors: list[str] = Field(default_factory=list)
